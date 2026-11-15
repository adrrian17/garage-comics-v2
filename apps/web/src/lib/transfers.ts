import type { Stripe } from "stripe";

// Stripe remembers an idempotency key for 24 hours. Past 23, a retry can no longer trust the key to return the first attempt's result, so it looks for that Transfer instead.
const IDEMPOTENCY_KEY_SAFE_MS = 23 * 60 * 60 * 1000;

/**
 * The same key for every retry of the Transfer of one comic sold, so a retry returns the first attempt's Transfer instead of paying twice.
 * `rejections` moves the key on only after Stripe refused outright, since Stripe keeps returning a refused request's error for its key.
 */
export const transferIdempotencyKey = (
  orderItemId: string,
  rejections: number
) => `transfer-${orderItemId}-${rejections}`;

export const canReuseIdempotencyKey = (
  firstAttemptAt: Date | null,
  now: Date
) =>
  firstAttemptAt === null ||
  now.getTime() - firstAttemptAt.getTime() < IDEMPOTENCY_KEY_SAFE_MS;

/**
 * The Author's Transfer for one comic sold: the price minus the Commission snapshotted at checkout.
 * It draws on the Order's charge, so the money reaches the Author only once that charge's funds are available.
 */
export const transferParams = (
  item: {
    orderId: string;
    orderItemId: string;
    priceCentavos: number;
    commissionCentavos: number;
  },
  target: { destination: string; chargeId: string }
): Stripe.TransferCreateParams => ({
  amount: item.priceCentavos - item.commissionCentavos,
  currency: "mxn",
  destination: target.destination,
  source_transaction: target.chargeId,
  transfer_group: item.orderId,
  metadata: { orderId: item.orderId, orderItemId: item.orderItemId },
});

export const reconcileTransfer = (
  transfers: readonly Pick<Stripe.Transfer, "id" | "metadata">[],
  orderItemId: string
) => transfers.find((found) => found.metadata?.orderItemId === orderItemId);
