import { edition } from "@garage-comics/db/schema/editions";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { log } from "evlog";
import { z } from "zod";

import { adminMiddleware } from "@/functions/admin-middleware";
import { editionInput, editionPhase } from "@/lib/edition";
import { findActiveEdition } from "@/server/editions";
import { createDatabase } from "@/server/services";

const loadActiveEdition = async () => {
  const active = await findActiveEdition(createDatabase());

  if (active === undefined) {
    return null;
  }

  return { ...active, phase: editionPhase(active, new Date()) };
};

export const getActiveEdition = createServerFn({ method: "GET" }).handler(
  loadActiveEdition
);

/** The active Edition for the countdown on every page, or null when it cannot be read: a failed read hides the bar instead of taking down the page, the dashboards included. */
export const getCountdownEdition = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      return await loadActiveEdition();
    } catch (error) {
      log.warn({
        action: "load_countdown_edition",
        reason: "edition_read_failed",
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }
);

export const listEditions = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const now = new Date();

    const editions = await createDatabase()
      .select()
      .from(edition)
      .orderBy(desc(edition.proposalsOpenAt));

    return editions.map((item) => ({
      ...item,
      phase: editionPhase(item, now),
    }));
  });

export const createEdition = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: FormData) =>
    editionInput.safeParse(Object.fromEntries(data))
  )
  .handler(async ({ data }) => {
    if (!data.success) {
      return {
        status: "invalid" as const,
        message: data.error.issues[0]?.message,
      };
    }

    await createDatabase().insert(edition).values(data.data);

    return { status: "created" as const };
  });

export const activateEdition = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const db = createDatabase();

    // D1 runs a batch as one transaction, so a failed switch keeps the previous Edition active.
    await db.batch([
      db
        .update(edition)
        .set({ isActive: false })
        .where(eq(edition.isActive, true)),
      db.update(edition).set({ isActive: true }).where(eq(edition.id, data.id)),
    ]);
  });
