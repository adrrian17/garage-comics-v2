import { createAuth as createConfiguredAuth } from "@garage-comics/auth";
import { createDb } from "@garage-comics/db";
import { env } from "cloudflare:workers";
import { log } from "evlog";
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

/** The event a Stripe webhook request carries, or null when its signature does not match `secret`. */
export const readStripeEvent = async (request: Request, secret: string) => {
  try {
    // Workers only have the async SubtleCrypto path for checking signatures.
    return await createStripe().webhooks.constructEventAsync(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (error) {
    // Whether a signing secret is bound, never its value: tells a missing or misbound secret apart from a forged request.
    log.warn({
      action: "stripe_signature",
      secretBound: secret.startsWith("whsec_"),
      secretEmpty: secret === "",
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
};
