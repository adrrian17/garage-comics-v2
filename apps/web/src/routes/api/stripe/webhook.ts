import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { log } from "evlog";

import { routeCheckoutEvent } from "@/lib/stripe-events";
import { cancelOrder, fulfillOrder } from "@/server/orders";
import { registerPayment, sendAuthorMagicLink } from "@/server/registrations";
import {
  createDatabase,
  createStripe,
  readStripeEvent,
} from "@/server/services";

const ok = () => new Response(null, { status: 200 });

const handleWebhook = async ({ request }: { request: Request }) => {
  const event = await readStripeEvent(request, env.STRIPE_WEBHOOK_SECRET);

  if (event === null) {
    return new Response("Firma inválida.", { status: 400 });
  }

  const action = routeCheckoutEvent(event);

  // An error here becomes a 500, which makes Stripe deliver the event again for up to three days.
  try {
    switch (action.kind) {
      case "registration_paid": {
        const email = await registerPayment(createDatabase(), action.session);

        if (email !== null) {
          await sendAuthorMagicLink(email, request.headers);
        }

        return ok();
      }

      case "order_paid": {
        await fulfillOrder(
          createDatabase(),
          createStripe(),
          action,
          new Date()
        );

        return ok();
      }

      case "order_cancelled": {
        await cancelOrder(createDatabase(), action.orderId, action.sessionId);

        return ok();
      }

      case "ignore": {
        if (action.reason === "unrecognized_session") {
          log.warn({
            action: "stripe_webhook",
            reason: action.reason,
            eventType: event.type,
          });
        }

        return ok();
      }

      default: {
        return action satisfies never;
      }
    }
  } catch (error) {
    log.error({
      action: "stripe_webhook",
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response("No pudimos procesar el evento.", { status: 500 });
  }
};

export const Route = createFileRoute("/api/stripe/webhook")({
  server: { handlers: { POST: handleWebhook } },
});
