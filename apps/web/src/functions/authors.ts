import { authorProfile } from "@garage-comics/db/schema/authors";
import { edition, registration } from "@garage-comics/db/schema/editions";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { authorMiddleware } from "@/functions/author-middleware";
import { authorProfileInput } from "@/lib/author";
import { createAuth, createDatabase } from "@/server/services";

export const getAuthorHome = createServerFn({ method: "GET" })
  .middleware([authorMiddleware])
  .handler(async ({ context }) => {
    const db = createDatabase();
    const userId = context.session.user.id;

    const [profile, registrations] = await Promise.all([
      db
        .select({
          slug: authorProfile.slug,
          displayName: authorProfile.displayName,
        })
        .from(authorProfile)
        .where(eq(authorProfile.userId, userId))
        .get(),
      db
        .select({
          id: registration.id,
          editionName: edition.name,
          amountMxn: registration.amountMxn,
          registeredAt: registration.createdAt,
        })
        .from(registration)
        .innerJoin(edition, eq(edition.id, registration.editionId))
        .where(eq(registration.userId, userId))
        .orderBy(desc(registration.createdAt)),
    ]);

    return { profile: profile ?? null, registrations };
  });

export const hasAuthorProfile = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await createAuth().api.getSession({
      headers: getRequest().headers,
    });

    return (
      session !== null &&
      (await createDatabase()
        .select({ userId: authorProfile.userId })
        .from(authorProfile)
        .where(eq(authorProfile.userId, session.user.id))
        .get()) !== undefined
    );
  }
);

export const getAuthorProfile = createServerFn({ method: "GET" })
  .middleware([authorMiddleware])
  .handler(
    async ({ context }) =>
      (await createDatabase()
        .select()
        .from(authorProfile)
        .where(eq(authorProfile.userId, context.session.user.id))
        .get()) ?? null
  );

export const saveAuthorProfile = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .validator((data: FormData) =>
    authorProfileInput.safeParse(Object.fromEntries(data))
  )
  .handler(async ({ data, context }) => {
    if (!data.success) {
      return {
        status: "invalid" as const,
        message: data.error.issues[0]?.message,
      };
    }

    // The slug stays as it was: it is the address of the public page.
    await createDatabase()
      .update(authorProfile)
      .set(data.data)
      .where(eq(authorProfile.userId, context.session.user.id));

    return { status: "saved" as const };
  });

export const getAuthorPage = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(
    async ({ data }) =>
      // The user id stays out: this page is public.
      (await createDatabase()
        .select({
          displayName: authorProfile.displayName,
          role: authorProfile.role,
          bio: authorProfile.bio,
          instagramUrl: authorProfile.instagramUrl,
          xUrl: authorProfile.xUrl,
          facebookUrl: authorProfile.facebookUrl,
          portfolioUrl: authorProfile.portfolioUrl,
        })
        .from(authorProfile)
        .where(eq(authorProfile.slug, data.slug))
        .get()) ?? null
  );
