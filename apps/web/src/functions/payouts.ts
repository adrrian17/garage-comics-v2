import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { authorMiddleware } from "@/functions/author-middleware";
import { payoutSetupStatus } from "@/lib/payout-setup";
import { findActiveEdition } from "@/server/editions";
import {
  ensureStripeAccountId,
  findStripeAccount,
  recordPayoutStatus,
} from "@/server/payouts";
import { listAuthorSales } from "@/server/sales";
import { createDatabase, createStripe } from "@/server/services";

export const getPayoutSetup = createServerFn({ method: "GET" })
  .middleware([authorMiddleware])
  .handler(async ({ context }) => {
    const db = createDatabase();

    const [account, activeEdition, sales] = await Promise.all([
      findStripeAccount(db, context.session.user.id),
      findActiveEdition(db),
      listAuthorSales(db, context.session.user.id),
    ]);

    const status = payoutSetupStatus(account);

    await recordPayoutStatus(db, context.session.user.id, status);

    return {
      userId: context.session.user.id,
      status,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY,
      salesOpenAt: activeEdition?.salesOpenAt ?? null,
      // Apart from `status`: Stripe can ask an active account for more details, and its balance and Payouts must stay visible meanwhile.
      hasBalance: account?.details_submitted === true,
      sales,
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
        // Read-only on purpose: the account has `controller.fees.payer: "application"`, so Garage Cómics would pay for instant or manual payouts, and the weekly Monday schedule is a product rule.
        balances: {
          enabled: true,
          features: {
            instant_payouts: false,
            standard_payouts: false,
            edit_payout_schedule: false,
            external_account_collection: false,
          },
        },
        payouts_list: { enabled: true },
      },
    });

    return session.client_secret;
  });
