import { upsertAdmin } from "@garage-comics/auth";
import { user } from "@garage-comics/db/schema/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminMiddleware } from "@/functions/admin-middleware";
import { createAuth, createDatabase } from "@/server/services";

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(
    async () =>
      await createDatabase()
        .select({
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        })
        .from(user)
        .where(eq(user.role, "admin"))
        .orderBy(asc(user.createdAt))
  );

export const inviteAdmin = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) })
  )
  .handler(async ({ data }) => {
    await upsertAdmin(createDatabase(), data.email);
    await createAuth().api.signInMagicLink({
      body: { email: data.email, callbackURL: "/admin" },
      headers: getRequest().headers,
    });
  });
