import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { log } from "evlog";

import { syncPayoutStatus } from "@/server/payouts";
import { createDatabase, readStripeEvent } from "@/server/services";

const handleConnectWebhook = async ({ request }: { request: Request }) => {
  const event = await readStripeEvent(
    request,
    env.STRIPE_CONNECT_WEBHOOK_SECRET
  );

  if (event === null) {
    return new Response("Firma inválida.", { status: 400 });
  }

  if (event.type !== "account.updated") {
    return new Response(null, { status: 200 });
  }

  try {
    await syncPayoutStatus(createDatabase(), event.data.object.id);
  } catch (error) {
    log.error({
      action: "stripe_connect_webhook",
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });

    // Stripe delivers the event again, for up to three days.
    return new Response("No pudimos procesar el evento.", { status: 500 });
  }

  return new Response(null, { status: 200 });
};

/** Events from the Authors' connected Stripe accounts, which Stripe sends to their own endpoint with their own signing secret. */
export const Route = createFileRoute("/api/stripe/connect-webhook")({
  server: { handlers: { POST: handleConnectWebhook } },
});
