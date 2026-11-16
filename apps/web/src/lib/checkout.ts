import type { Stripe } from "stripe";
import { z } from "zod";

import { cartIds } from "./cart";
import { soonestCheckoutExpiry } from "./proposal";

/** How long a Customer has to pay an OXXO voucher at a store (story 28). */
const OXXO_VOUCHER_DAYS = 2;

/** What a Customer sends to pay: ids and an email, never a price, because the server reads prices from the database. */
export const checkoutInput = z.object({
  ids: cartIds
    .min(1, "Tu carrito está vacío.")
    .transform((ids) => [...new Set(ids)]),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Escribe un correo válido.")),
});

/** The Checkout Session for one Order: card or OXXO, one line per comic, the Order id in the metadata so the webhook can find it. */
export const checkoutSessionParams = ({
  orderId,
  email,
  priceIds,
  origin,
  now,
}: {
  orderId: string;
  email: string;
  priceIds: string[];
  origin: string;
  now: Date;
}): Stripe.Checkout.SessionCreateParams => ({
  mode: "payment",
  // Stripe's current API replaced `payment_method_types` with this filter: OXXO is offered when it is enabled in the Dashboard and eligible.
  allowed_payment_method_types: ["card", "oxxo"],
  payment_method_options: { oxxo: { expires_after_days: OXXO_VOUCHER_DAYS } },
  line_items: priceIds.map((price) => ({ price, quantity: 1 })),
  customer_email: email,
  metadata: { kind: "order", orderId },
  payment_intent_data: { transfer_group: orderId },
  expires_at: Math.floor(soonestCheckoutExpiry(now).getTime() / 1000),
  success_url: `${origin}/compra/lista`,
  cancel_url: `${origin}/carrito`,
});
