import { edition } from "@garage-comics/db/schema/editions";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminMiddleware } from "@/functions/admin-middleware";
import { editionInput, editionPhase } from "@/lib/edition";
import { findActiveEdition } from "@/server/editions";
import { createDatabase } from "@/server/services";

export const getActiveEdition = createServerFn({ method: "GET" }).handler(
  async () => {
    const active = await findActiveEdition(createDatabase());

    if (active === undefined) {
      return null;
    }

    return { ...active, phase: editionPhase(active, new Date()) };
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
