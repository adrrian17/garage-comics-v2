import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { Stripe } from "stripe";

import { registerPayment, sendAuthorMagicLink } from "@/server/registrations";
import { createDatabase, createStripe } from "@/server/services";

const ok = () => new Response(null, { status: 200 });

const handleWebhook = async ({ request }: { request: Request }) => {
  const payload = await request.text();

  let event: Stripe.Event;

  try {
    // Workers only have the async SubtleCrypto path for checking signatures.
    event = await createStripe().webhooks.constructEventAsync(
      payload,
      request.headers.get("stripe-signature") ?? "",
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch {
    return new Response("Firma inválida.", { status: 400 });
  }

  // Only a paid Checkout Session registers: the success redirect proves nothing.
  if (
    event.type !== "checkout.session.completed" ||
    event.data.object.payment_status !== "paid"
  ) {
    return ok();
  }

  const email = await registerPayment(createDatabase(), event.data.object);

  if (email !== null) {
    await sendAuthorMagicLink(email, request.headers);
  }

  return ok();
};

export const Route = createFileRoute("/api/stripe/webhook")({
  server: { handlers: { POST: handleWebhook } },
});
