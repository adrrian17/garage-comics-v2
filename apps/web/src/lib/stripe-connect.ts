import type { StripeConnectInstance } from "@stripe/connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js/pure";

import { createPayoutSession } from "@/functions/payouts";

// Connect.js asks for a client secret as soon as it initializes, so a second instance (a remount, React's dev double render) would race the first to create the Stripe account. One per signed-in user and page load.
let current: { userId: string; instance: StripeConnectInstance } | null = null;

/** Ends the Stripe session of the embedded components; Stripe keeps it apart from the app's own session. */
export const logoutConnect = () => {
  void current?.instance.logout();
  current = null;
};

export const getConnect = (userId: string, publishableKey: string) => {
  if (current?.userId !== userId) {
    logoutConnect();
    current = {
      userId,
      instance: loadConnectAndInitialize({
        publishableKey,
        locale: "es-419",
        fetchClientSecret: async () => await createPayoutSession(),
      }),
    };
  }

  return current.instance;
};
