import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@garage-comics/db";
// oxlint-disable-next-line sonarjs/no-wildcard-import -- the Drizzle adapter needs every auth table.
import * as schema from "@garage-comics/db/schema/auth";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { magicLink } from "better-auth/plugins/magic-link";
import type { MagicLinkOptions } from "better-auth/plugins/magic-link";
import { z } from "zod";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  ADMIN_EMAIL: string;
}

const magicLinkBody = z.object({ email: z.email() });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Makes the account for `email` exist with the Admin role; safe to repeat. */
export const upsertAdmin = async (database: Database, email: string) => {
  const normalized = normalizeEmail(email);
  const [localPart = normalized] = normalized.split("@");

  await database
    .insert(schema.user)
    .values({
      id: crypto.randomUUID(),
      name: localPart,
      email: normalized,
      role: "admin",
    })
    .onConflictDoUpdate({ target: schema.user.email, set: { role: "admin" } });
};

export const createAuth = (
  env: AuthConfig,
  database: Database,
  sendMagicLink: MagicLinkOptions["sendMagicLink"]
) =>
  betterAuth({
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    user: {
      additionalFields: {
        role: {
          type: ["admin", "author"],
          input: false,
          required: false,
          defaultValue: "author",
        },
      },
    },
    hooks: {
      // The first Admin comes from configuration, so seed it right before its first sign-in.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/magic-link") {
          return;
        }

        const body = magicLinkBody.safeParse(ctx.body);

        if (
          body.success &&
          normalizeEmail(body.data.email) === normalizeEmail(env.ADMIN_EMAIL)
        ) {
          await upsertAdmin(database, body.data.email);
        }
      }),
    },
    plugins: [magicLink({ disableSignUp: true, sendMagicLink })],
  });

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
