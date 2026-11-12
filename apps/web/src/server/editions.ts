import type { Database } from "@garage-comics/db";
import { edition, proposal } from "@garage-comics/db/schema/editions";
import { and, eq, lte } from "drizzle-orm";

import { acceptanceCutoff, proposalTransitions } from "@/lib/proposal";

export const findActiveEdition = async (db: Database) =>
  await db.select().from(edition).where(eq(edition.isActive, true)).get();

// shortcut: lazy expiry on read, move to a Worker cron trigger when slice 2 adds Registration payment
export const expireStaleAcceptances = async (db: Database, now: Date) => {
  const { from, to } = proposalTransitions.expire;

  await db
    .update(proposal)
    .set({ status: to })
    .where(
      and(
        eq(proposal.status, from),
        lte(proposal.acceptedAt, acceptanceCutoff(now))
      )
    );
};
