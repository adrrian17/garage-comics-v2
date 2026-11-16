import type { OrderStatus } from "@garage-comics/db/schema/orders";

/** A confirmed payment is accepted from these states. A cancelled Order still accepts it: Stripe took the money, so the money is the truth. A paid Order never does, which is what makes a replayed event harmless. */
export const payableStatuses = [
  "pending",
  "cancelled",
] as const satisfies readonly OrderStatus[];

/** Only an Order still waiting for its payment can be cancelled; a late or out-of-order cancellation cannot touch a paid one. */
export const cancellableStatuses = [
  "pending",
] as const satisfies readonly OrderStatus[];

export const orderTotalCentavos = (
  items: readonly { priceCentavos: number }[]
) => items.reduce((total, item) => total + item.priceCentavos, 0);
