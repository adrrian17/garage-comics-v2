import type { Database } from "@garage-comics/db";
import { user } from "@garage-comics/db/schema/auth";
import { authorProfile } from "@garage-comics/db/schema/authors";
import {
  edition,
  proposal,
  registration,
} from "@garage-comics/db/schema/editions";
import { env } from "cloudflare:workers";
import { and, eq, inArray, like } from "drizzle-orm";
import { log } from "evlog";
import type { Stripe } from "stripe";

import { availableSlug, slugify } from "@/lib/author";
import {
  acceptanceDeadline,
  checkoutExpiresAt,
  registrableStatuses,
} from "@/lib/proposal";
import { expireStaleAcceptances } from "@/server/editions";
import { createAuth, createStripe } from "@/server/services";

const CENTAVOS_PER_PESO = 100;

/** The page where a proposer pays; the acceptance email links here because a Checkout Session itself lives at most 24 hours. */
export const registrationUrl = (proposalId: string) =>
  `${env.BETTER_AUTH_URL}/inscripcion/${proposalId}`;

const findProposal = async (db: Database, proposalId: string) =>
  await db
    .select({ proposal, edition })
    .from(proposal)
    .innerJoin(edition, eq(edition.id, proposal.editionId))
    .where(eq(proposal.id, proposalId))
    .get();

type FoundProposal = NonNullable<Awaited<ReturnType<typeof findProposal>>>;

export type RegistrationOffer =
  | {
      status: "payable";
      email: string;
      editionName: string;
      priceMxn: number;
      deadline: Date;
    }
  | { status: "free"; email: string; editionName: string }
  | { status: "registered" }
  | { status: "unavailable" };

/** What a proposer can do with their payment link right now. */
export const findRegistrationOffer = async (
  db: Database,
  proposalId: string,
  now: Date
): Promise<RegistrationOffer> => {
  await expireStaleAcceptances(db, now);

  const found = await findProposal(db, proposalId);

  if (found === undefined) {
    return { status: "unavailable" };
  }

  if (found.proposal.status === "registered") {
    return { status: "registered" };
  }

  if (
    found.proposal.status !== "accepted" ||
    found.proposal.acceptedAt === null ||
    !found.edition.isActive
  ) {
    return { status: "unavailable" };
  }

  // An Admin does not pay the Registration.
  const holder = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.email, found.proposal.email))
    .get();

  if (holder?.role === "admin") {
    return {
      status: "free",
      email: found.proposal.email,
      editionName: found.edition.name,
    };
  }

  return {
    status: "payable",
    email: found.proposal.email,
    editionName: found.edition.name,
    priceMxn: found.edition.registrationPriceMxn,
    deadline: acceptanceDeadline(found.proposal.acceptedAt),
  };
};

/** Opens a Stripe Checkout Session for the Registration and returns where to send the proposer, or null when the link no longer works. */
export const createRegistrationCheckout = async (
  db: Database,
  proposalId: string,
  now: Date
) => {
  const offer = await findRegistrationOffer(db, proposalId, now);

  if (offer.status !== "payable") {
    return null;
  }

  const stripe = createStripe();
  const pageUrl = registrationUrl(proposalId);

  // shortcut: a Product and a Price per Checkout Session because the Stripe emulator rejects inline `price_data`; create them once per Edition when that matters in the Stripe dashboard.
  const product = await stripe.products.create({
    name: `Inscripción a ${offer.editionName}`,
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "mxn",
    unit_amount: offer.priceMxn * CENTAVOS_PER_PESO,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: price.id, quantity: 1 }],
    customer_email: offer.email,
    metadata: { proposalId },
    expires_at: Math.floor(
      checkoutExpiresAt(offer.deadline, now).getTime() / 1000
    ),
    success_url: `${pageUrl}?pagado=1`,
    cancel_url: pageUrl,
  });

  return session.url;
};

/**
 * Creates the Registration and, for a new proposer, their Author account and profile.
 * Safe to repeat: the unique `proposalId` makes a replay change nothing. Returns the proposer's email, or null when the Registration already existed.
 */
const recordRegistration = async (
  db: Database,
  found: FoundProposal,
  payment: { amountMxn: number; stripeCheckoutSessionId: string | null }
) => {
  const { email } = found.proposal;

  const existingUser = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .get();

  const userId = existingUser?.id ?? crypto.randomUUID();

  const takenSlugs = await db
    .select({ slug: authorProfile.slug })
    .from(authorProfile)
    .where(like(authorProfile.slug, `${slugify(found.proposal.name)}%`));

  // D1 runs a batch as one transaction: a failure leaves nothing half-registered, and Stripe retries the webhook.
  const results = await db.batch([
    // A returning Author keeps their account and role (story 13).
    db
      .insert(user)
      .values({
        id: userId,
        name: found.proposal.name,
        email,
        role: "author",
      })
      .onConflictDoNothing({ target: user.email }),
    db
      .update(proposal)
      .set({ status: "registered" })
      .where(
        and(
          eq(proposal.id, found.proposal.id),
          inArray(proposal.status, registrableStatuses)
        )
      ),
    db
      .insert(registration)
      .values({
        editionId: found.edition.id,
        userId,
        proposalId: found.proposal.id,
        ...payment,
      })
      .onConflictDoNothing({ target: registration.proposalId })
      .returning({ id: registration.id }),
    db
      .insert(authorProfile)
      .values({
        userId,
        slug: availableSlug(
          found.proposal.name,
          takenSlugs.map((row) => row.slug)
        ),
        displayName: found.proposal.name,
      })
      .onConflictDoNothing({ target: authorProfile.userId }),
  ]);

  // The third statement is the Registration insert; it returns no row when the proposal was already registered.
  return results[2].length === 0 ? null : email;
};

/** Turns a paid Checkout Session into a Registration. Returns the new Author's email, or null when it already existed. */
export const registerPayment = async (
  db: Database,
  session: Stripe.Checkout.Session
) => {
  const proposalId = session.metadata?.proposalId;

  const found =
    proposalId === undefined ? undefined : await findProposal(db, proposalId);

  if (found === undefined) {
    log.warn({ action: "register_payment", reason: "unknown_proposal" });

    return null;
  }

  if (found.proposal.status === "expired") {
    log.warn({
      action: "register_payment",
      reason: "paid_after_expiry",
      proposalId: found.proposal.id,
    });
  }

  return await recordRegistration(db, found, {
    // Editions never change their price after creation, so this is what the proposer paid.
    amountMxn: found.edition.registrationPriceMxn,
    stripeCheckoutSessionId: session.id,
  });
};

/** Registers the signed-in Admin whose Proposal was accepted, at no cost. Returns false when the link or the session does not allow it. */
export const registerAdminForFree = async (
  db: Database,
  proposalId: string,
  sessionUser: { role?: string | null; email: string },
  now: Date
) => {
  const offer = await findRegistrationOffer(db, proposalId, now);

  if (
    offer.status !== "free" ||
    sessionUser.role !== "admin" ||
    sessionUser.email !== offer.email
  ) {
    return false;
  }

  const found = await findProposal(db, proposalId);

  if (found === undefined) {
    return false;
  }

  await recordRegistration(db, found, {
    amountMxn: 0,
    stripeCheckoutSessionId: null,
  });

  return true;
};

/** Emails the new Author their first magic link; a failure is logged because the Registration is already saved and they can ask for a link at /entrar. */
export const sendAuthorMagicLink = async (email: string, headers: Headers) => {
  try {
    await createAuth().api.signInMagicLink({
      body: { email, callbackURL: "/autor" },
      headers,
    });
  } catch (error) {
    log.error({
      action: "send_author_magic_link",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
