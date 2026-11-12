import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@garage-comics/db";
// oxlint-disable-next-line sonarjs/no-wildcard-import -- the Drizzle adapter needs every auth table.
import * as schema from "@garage-comics/db/schema/auth";
import { betterAuth } from "better-auth";

export interface AuthConfig {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
}

export const createAuth = (env: AuthConfig, database: Database) =>
  betterAuth({
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [],
  });

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
