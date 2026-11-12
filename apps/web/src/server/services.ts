import { createAuth as createConfiguredAuth } from "@garage-comics/auth";
import { createDb } from "@garage-comics/db";
import { env } from "cloudflare:workers";

import { magicLinkEmail, sendEmail } from "@/server/email";

const createDatabase = () => createDb(env);

export const createAuth = () =>
  createConfiguredAuth(env, createDatabase(), async ({ email, url }) => {
    await sendEmail({ to: email, ...magicLinkEmail(url) });
  });
