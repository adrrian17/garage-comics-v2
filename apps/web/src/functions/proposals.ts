import {
  edition,
  proposal,
  proposalStatuses,
} from "@garage-comics/db/schema/editions";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminMiddleware } from "@/functions/admin-middleware";
import { editionPhase } from "@/lib/edition";
import { formatDateTime, formatMxn } from "@/lib/format";
import {
  acceptanceDeadline,
  proposalInput,
  proposalTransitions,
} from "@/lib/proposal";
import { expireStaleAcceptances, findActiveEdition } from "@/server/editions";
import {
  proposalAcceptedEmail,
  proposalNotAcceptedEmail,
  proposalReceivedEmail,
  sendNotification,
} from "@/server/email";
import { createDatabase } from "@/server/services";

export const submitProposal = createServerFn({ method: "POST" })
  .validator((data: FormData) =>
    proposalInput.safeParse(Object.fromEntries(data))
  )
  .handler(async ({ data }) => {
    if (!data.success) {
      return {
        status: "invalid" as const,
        message: data.error.issues[0]?.message,
      };
    }

    const db = createDatabase();
    const now = new Date();
    const active = await findActiveEdition(db);

    if (active === undefined || editionPhase(active, now) !== "proposals") {
      return { status: "closed" as const };
    }

    await expireStaleAcceptances(db, now);

    // The partial unique index refuses a second open Proposal for the same email.
    const [created] = await db
      .insert(proposal)
      .values({ ...data.data, editionId: active.id })
      .onConflictDoNothing()
      .returning({ id: proposal.id });

    if (created === undefined) {
      return { status: "duplicate" as const };
    }

    await sendNotification({
      to: data.data.email,
      ...proposalReceivedEmail(active.name),
    });

    return { status: "sent" as const, email: data.data.email };
  });

export const listProposals = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.object({ status: z.enum(proposalStatuses).optional() }))
  .handler(async ({ data }) => {
    const db = createDatabase();
    const active = await findActiveEdition(db);

    if (active === undefined) {
      return null;
    }

    const now = new Date();
    await expireStaleAcceptances(db, now);

    const proposals = await db
      .select()
      .from(proposal)
      .where(
        and(
          eq(proposal.editionId, active.id),
          data.status === undefined
            ? undefined
            : eq(proposal.status, data.status)
        )
      )
      .orderBy(desc(proposal.createdAt));

    return {
      edition: { ...active, phase: editionPhase(active, now) },
      proposals,
    };
  });

type DecidedEdition = typeof edition.$inferSelect;

const decisionEmails = {
  accept: (decidedEdition: DecidedEdition, now: Date) =>
    proposalAcceptedEmail({
      editionName: decidedEdition.name,
      registrationPrice: formatMxn(decidedEdition.registrationPriceMxn),
      deadline: formatDateTime(acceptanceDeadline(now)),
    }),
  reject: (decidedEdition: DecidedEdition) =>
    proposalNotAcceptedEmail(decidedEdition.name),
} as const;

export const decideProposal = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({ id: z.string(), decision: z.enum(["accept", "reject"]) })
  )
  .handler(async ({ data }) => {
    const db = createDatabase();
    const now = new Date();
    const { from, to } = proposalTransitions[data.decision];

    await expireStaleAcceptances(db, now);

    // Matching on the `from` status makes the change atomic: a Proposal decided elsewhere is left alone.
    const [decided] = await db
      .update(proposal)
      .set({
        status: to,
        decidedAt: now,
        acceptedAt: data.decision === "accept" ? now : null,
      })
      .where(and(eq(proposal.id, data.id), eq(proposal.status, from)))
      .returning();

    if (decided === undefined) {
      return { status: "stale" as const };
    }

    const decidedEdition = await db
      .select()
      .from(edition)
      .where(eq(edition.id, decided.editionId))
      .get();

    const notified =
      decidedEdition !== undefined &&
      (await sendNotification({
        to: decided.email,
        ...decisionEmails[data.decision](decidedEdition, now),
      }));

    return { status: "decided" as const, notified, email: decided.email };
  });
