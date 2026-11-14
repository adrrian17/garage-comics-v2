import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { authorMiddleware } from "@/functions/author-middleware";
import { payoutSetupStatus } from "@/lib/payout-setup";
import { findActiveEdition } from "@/server/editions";
import { ensureStripeAccountId, findStripeAccount } from "@/server/payouts";
import { createDatabase, createStripe } from "@/server/services";

export const getPayoutSetup = createServerFn({ method: "GET" })
  .middleware([authorMiddleware])
  .handler(async ({ context }) => {
    const db = createDatabase();

    const [account, activeEdition] = await Promise.all([
      findStripeAccount(db, context.session.user.id),
      findActiveEdition(db),
    ]);

    return {
      userId: context.session.user.id,
      status: payoutSetupStatus(account),
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      salesOpenAt: activeEdition?.salesOpenAt ?? null,
    };
  });

/** Returns the client secret that lets the browser open Stripe's embedded onboarding for this Author. */
export const createPayoutSession = createServerFn({ method: "POST" })
  .middleware([authorMiddleware])
  .handler(async ({ context }) => {
    const account = await ensureStripeAccountId(
      createDatabase(),
      context.session.user
    );

    const session = await createStripe().accountSessions.create({
      account,
      components: {
        account_onboarding: {
          enabled: true,
          features: { external_account_collection: true },
        },
      },
    });

    return session.client_secret;
  });
