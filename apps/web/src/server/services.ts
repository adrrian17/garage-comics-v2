import { createAuth as createConfiguredAuth } from "@garage-comics/auth";
import { createDb } from "@garage-comics/db";
import { env } from "cloudflare:workers";
import { Stripe } from "stripe";

import { magicLinkEmail, sendEmail } from "@/server/email";

export const createDatabase = () => createDb(env);

export const createAuth = () =>
  createConfiguredAuth(env, createDatabase(), async ({ email, url }) => {
    await sendEmail({ to: email, ...magicLinkEmail(url) });
  });

// Workers have no Node HTTP stack, so the SDK goes through fetch. `STRIPE_API_URL` is set only in development, to reach the Stripe emulator.
export const createStripe = () => {
  const config: Stripe.StripeConfig = {
    httpClient: Stripe.createFetchHttpClient(),
  };

  if (env.STRIPE_API_URL !== "") {
    const api = new URL(env.STRIPE_API_URL);

    config.host = api.hostname;
    config.port = api.port;
    config.protocol = api.protocol === "https:" ? "https" : "http";
  }

  return new Stripe(env.STRIPE_SECRET_KEY, config);
};
