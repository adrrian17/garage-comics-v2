import type { Database } from "@garage-comics/db";
import { authorProfile } from "@garage-comics/db/schema/authors";
import { and, eq, isNull } from "drizzle-orm";
import type { Stripe } from "stripe";

import { createStripe } from "@/server/services";

const findAccountId = async (db: Database, userId: string) => {
  const row = await db
    .select({ id: authorProfile.stripeAccountId })
    .from(authorProfile)
    .where(eq(authorProfile.userId, userId))
    .get();

  return row?.id ?? null;
};

/**
 * The Author's Stripe account, created on first use. Safe to repeat and to race:
 * Stripe returns the same account for the same idempotency key, and only the first save sticks.
 */
export const ensureStripeAccountId = async (
  db: Database,
  user: { id: string; email: string }
) => {
  const existing = await findAccountId(db, user.id);

  if (existing !== null) {
    return existing;
  }

  const params: Stripe.AccountCreateParams = {
    country: "MX",
    email: user.email,
    // Authors never see Stripe's dashboard, so Garage Cómics bears fees and losses and collects the requirements itself, through the embedded onboarding. Stripe rejects Stripe-collected requirements on such an account unless Stripe also bears the losses.
    controller: {
      stripe_dashboard: { type: "none" },
      fees: { payer: "application" },
      losses: { payments: "application" },
      requirement_collection: "application",
    },
    capabilities: { transfers: { requested: true } },
    settings: {
      payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } },
    },
    metadata: { userId: user.id },
  };

  // Stripe remembers a key for 24 hours, failed attempts included, and refuses it with other parameters; hashing them in lets a changed email or config retry at once.
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(params))
  );

  const paramsHash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  const account = await createStripe().accounts.create(params, {
    idempotencyKey: `connect-account-${user.id}-${paramsHash}`,
  });

  await db
    .update(authorProfile)
    .set({ stripeAccountId: account.id })
    .where(
      and(
        eq(authorProfile.userId, user.id),
        isNull(authorProfile.stripeAccountId)
      )
    );

  // Whatever is stored wins, so concurrent first visits converge on one account.
  const stored = await findAccountId(db, user.id);

  if (stored === null) {
    throw new Error(
      "El Autor no tiene perfil para guardar su cuenta de Stripe."
    );
  }

  return stored;
};

/** The live Stripe account of an Author, or null before their first visit. */
export const findStripeAccount = async (db: Database, userId: string) => {
  const accountId = await findAccountId(db, userId);

  return accountId === null
    ? null
    : await createStripe().accounts.retrieve(accountId);
};
