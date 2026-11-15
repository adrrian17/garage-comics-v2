import type { Stripe } from "stripe";
import { z } from "zod";

/** A paid Checkout Session of an Order, reduced to what fulfilling it needs. */
export interface PaidOrder {
  orderId: string;
  sessionId: string;
  paymentIntentId: string | null;
  /** The address Stripe collected, which wins over the one typed in our form. */
  email: string | null;
}

type RegistrationSession = Pick<Stripe.Checkout.Session, "id" | "metadata">;

export type CheckoutEventAction =
  | { kind: "registration_paid"; session: RegistrationSession }
  | ({ kind: "order_paid" } & PaidOrder)
  | { kind: "order_cancelled"; orderId: string; sessionId: string }
  | {
      kind: "ignore";
      reason: "not_paid" | "unhandled_event" | "unrecognized_session";
    };

// A webhook payload never expands the payment intent, so anything but an id counts as none.
const checkoutSession = z.object({
  id: z.string(),
  payment_status: z.string(),
  metadata: z.record(z.string(), z.string()).catch({}),
  payment_intent: z.string().nullable().catch(null),
  customer_details: z
    .object({ email: z.string().nullable().catch(null) })
    .nullable()
    .catch(null),
});

type CheckoutSession = z.infer<typeof checkoutSession>;

// A card is paid at `completed`; OXXO completes unpaid when the voucher is issued and pays later, at `async_payment_succeeded`.
const paymentEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

// The Checkout Session lapsed, or an OXXO voucher expired unpaid.
const lapseEvents = new Set([
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
]);

const routePayment = (session: CheckoutSession): CheckoutEventAction => {
  if (session.payment_status !== "paid") {
    return { kind: "ignore", reason: "not_paid" };
  }

  const { kind, orderId, proposalId } = session.metadata;

  if (kind === "order" && orderId !== undefined) {
    return {
      kind: "order_paid",
      orderId,
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      email: session.customer_details?.email?.trim().toLowerCase() ?? null,
    };
  }

  if (
    kind === "registration" ||
    (kind === undefined && proposalId !== undefined)
  ) {
    return { kind: "registration_paid", session };
  }

  return { kind: "ignore", reason: "unrecognized_session" };
};

const routeLapse = (session: CheckoutSession): CheckoutEventAction => {
  const { kind, orderId } = session.metadata;

  return kind === "order" && orderId !== undefined
    ? { kind: "order_cancelled", orderId, sessionId: session.id }
    : { kind: "ignore", reason: "unhandled_event" };
};

/**
 * The only list of the Stripe events this app handles, and what each one means. Everything else is ignored.
 * A Registration session from before `metadata.kind` existed carries only a `proposalId`, so it still routes to Registrations.
 * An order lapse is cancelled silently (story 31).
 */
export const routeCheckoutEvent = (event: {
  type: string;
  data: { object: unknown };
}): CheckoutEventAction => {
  const isPayment = paymentEvents.has(event.type);

  if (!isPayment && !lapseEvents.has(event.type)) {
    return { kind: "ignore", reason: "unhandled_event" };
  }

  const session = checkoutSession.safeParse(event.data.object);

  if (!session.success) {
    return { kind: "ignore", reason: "unrecognized_session" };
  }

  return isPayment ? routePayment(session.data) : routeLapse(session.data);
};
