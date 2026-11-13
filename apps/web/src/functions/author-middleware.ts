import { authorProfile } from "@garage-comics/db/schema/authors";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { eq, like } from "drizzle-orm";

import { availableSlug, slugify } from "@/lib/author";
import { createAuth, createDatabase } from "@/server/services";

/** Gives an Admin their Author profile the first time they open /admin/perfil; Admins are Authors without a Registration. */
const ensureAdminProfile = async (admin: { id: string; name: string }) => {
  const db = createDatabase();

  const existing = await db
    .select({ userId: authorProfile.userId })
    .from(authorProfile)
    .where(eq(authorProfile.userId, admin.id))
    .get();

  if (existing !== undefined) {
    return;
  }

  const taken = await db
    .select({ slug: authorProfile.slug })
    .from(authorProfile)
    .where(like(authorProfile.slug, `${slugify(admin.name)}%`));

  await db
    .insert(authorProfile)
    .values({
      userId: admin.id,
      slug: availableSlug(
        admin.name,
        taken.map((row) => row.slug)
      ),
      displayName: admin.name,
    })
    // Two loaders can race on the first visit; the loser's row is simply dropped.
    .onConflictDoNothing();
};

export const authorMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await createAuth().api.getSession({
      headers: getRequest().headers,
    });

    if (session === null) {
      setResponseStatus(403);
      throw new Error("Solo los Autores pueden hacer esto.");
    }

    if (session.user.role === "admin") {
      await ensureAdminProfile(session.user);
    }

    return await next({ context: { session } });
  }
);
