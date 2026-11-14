import type { StripeConnectInstance } from "@stripe/connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js/pure";

import { createPayoutSession } from "@/functions/payouts";

// Connect.js asks for a client secret as soon as it initializes, so a second instance (a remount, React's dev double render) would race the first to create the Stripe account. One per signed-in user and page load.
let current: { userId: string; instance: StripeConnectInstance } | null = null;

const LOGOUT_TIMEOUT_MS = 5000;

/**
 * Ends the Stripe session of the embedded components, which Stripe keeps apart from the app's own session.
 * Connect.js cannot start another session in the same page afterwards, so the caller must leave or reload it.
 */
export const logoutConnect = async () => {
  // Connect.js queues logout behind its own script download, which has no timeout of its own.
  const timeout = Promise.withResolvers();
  setTimeout(timeout.resolve, LOGOUT_TIMEOUT_MS);

  try {
    await Promise.race([current?.instance.logout(), timeout.promise]);
  } catch {
    // Leaving the page matters more than a failed logout, so a failure must not block it.
  }
};

export const getConnect = (userId: string, publishableKey: string) => {
  if (current !== null && current.userId !== userId) {
    // Someone else signed in from another tab: end the old session and start theirs on a fresh page. The logged-out instance renders nothing meanwhile.
    void (async () => {
      await logoutConnect();
      window.location.reload();
    })();

    return current.instance;
  }

  current ??= {
    userId,
    instance: loadConnectAndInitialize({
      publishableKey,
      locale: "es-419",
      fetchClientSecret: async () => await createPayoutSession(),
    }),
  };

  return current.instance;
};
