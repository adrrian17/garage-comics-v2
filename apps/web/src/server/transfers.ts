import type { Database } from "@garage-comics/db";
import { authorProfile } from "@garage-comics/db/schema/authors";
import { editionComic } from "@garage-comics/db/schema/comics";
import { order, orderItem, transfer } from "@garage-comics/db/schema/orders";
import { and, eq, isNull, sql } from "drizzle-orm";
import { log } from "evlog";
import { Stripe } from "stripe";
import { z } from "zod";

import { formatOrderNumber } from "@/lib/order-number";
import {
  canReuseIdempotencyKey,
  reconcileTransfer,
  transferIdempotencyKey,
  transferParams,
} from "@/lib/transfers";

export type TransferStripe = Pick<Stripe, "paymentIntents" | "transfers">;

const TRANSFER_GROUP_MAX = 1000;

const PAGE_SIZE = 100;

const HTTP_CONFLICT = 409;

const chargeId = z.string();

type Outcome = "sent" | "retry" | "stuck";

const unsentTransfers = async (db: Database, orderId: string) =>
  await db
    .select({
      orderItemId: transfer.orderItemId,
      firstAttemptAt: transfer.firstAttemptAt,
      attempts: transfer.attempts,
      priceCentavos: orderItem.priceCentavos,
      commissionCentavos: orderItem.commissionCentavos,
      orderNumber: order.number,
      paymentIntentId: order.stripePaymentIntentId,
      accountId: authorProfile.stripeAccountId,
    })
    .from(transfer)
    .innerJoin(orderItem, eq(orderItem.id, transfer.orderItemId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(editionComic, eq(editionComic.id, orderItem.editionComicId))
    .innerJoin(authorProfile, eq(authorProfile.userId, editionComic.authorId))
    .where(
      and(eq(orderItem.orderId, orderId), isNull(transfer.stripeTransferId))
    );

type UnsentTransfer = Awaited<ReturnType<typeof unsentTransfers>>[number];

const orderLabel = (row: UnsentTransfer) =>
  row.orderNumber === null ? null : formatOrderNumber(row.orderNumber);

const markSent = async (
  db: Database,
  orderItemId: string,
  stripeTransferId: string
) => {
  // Only the first writer sticks, so two deliveries racing on the same Transfer cannot overwrite each other.
  await db
    .update(transfer)
    .set({ stripeTransferId, lastError: null })
    .where(
      and(
        eq(transfer.orderItemId, orderItemId),
        isNull(transfer.stripeTransferId)
      )
    );
};

const createTransfer = async (
  db: Database,
  stripe: TransferStripe,
  row: UnsentTransfer,
  target: { paymentIntentId: string; destination: string },
  orderId: string,
  now: Date
): Promise<Outcome> => {
  const intent = await stripe.paymentIntents.retrieve(target.paymentIntentId);
  const charge = chargeId.safeParse(intent.latest_charge);

  if (!charge.success) {
    throw new Error("The payment has no charge yet.");
  }

  // Saved before the call: if Stripe's answer is lost, a later delivery must know when the idempotency key was first used.
  await db
    .update(transfer)
    .set({
      firstAttemptAt: sql`coalesce(${transfer.firstAttemptAt}, ${now.getTime()})`,
    })
    .where(eq(transfer.orderItemId, row.orderItemId));

  let created: Stripe.Transfer;

  try {
    created = await stripe.transfers.create(
      transferParams(
        { ...row, orderId, orderItemId: row.orderItemId },
        { destination: target.destination, chargeId: charge.data }
      ),
      { idempotencyKey: transferIdempotencyKey(row.orderItemId, row.attempts) }
    );
  } catch (error) {
    // An invalid request (for example, an account that cannot receive Transfers yet) created nothing, so the next delivery may try again with a new key and a new 23-hour window.
    // A 409 means another request holds the key right now, so its outcome is unknown and the key must stay.
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.statusCode !== HTTP_CONFLICT
    ) {
      // Only the request that used the current key may move it on: a late rejection of an older key must not discard a newer attempt.
      await db
        .update(transfer)
        .set({ attempts: sql`${transfer.attempts} + 1`, firstAttemptAt: null })
        .where(
          and(
            eq(transfer.orderItemId, row.orderItemId),
            eq(transfer.attempts, row.attempts),
            isNull(transfer.stripeTransferId)
          )
        );
    }

    throw error;
  }

  await markSent(db, row.orderItemId, created.id);

  return "sent";
};

// Reached when the first attempt is old enough that Stripe may have forgotten its idempotency key.
const adoptExistingTransfer = async (
  db: Database,
  stripe: TransferStripe,
  row: UnsentTransfer,
  orderId: string
): Promise<Outcome> => {
  const existing = reconcileTransfer(
    await stripe.transfers
      .list({ transfer_group: orderId, limit: PAGE_SIZE })
      .autoPagingToArray({ limit: TRANSFER_GROUP_MAX }),
    row.orderItemId
  );

  if (existing === undefined) {
    // The first attempt may have succeeded with its answer lost, so creating another could pay the Author twice. A person checks the Transfers in the Stripe Dashboard.
    log.error({
      action: "send_transfer",
      reason: "unknown_outcome_after_key_expiry",
      orderId,
      orderNumber: orderLabel(row),
      orderItemId: row.orderItemId,
    });

    return "stuck";
  }

  await markSent(db, row.orderItemId, existing.id);

  return "sent";
};

const sendOne = async (
  db: Database,
  stripe: TransferStripe,
  row: UnsentTransfer,
  orderId: string,
  now: Date
): Promise<Outcome> => {
  if (row.paymentIntentId === null || row.accountId === null) {
    // Retrying cannot change what we already have: the payload came without a payment intent (the Stripe emulator sends none), or the Author never opened their Stripe account.
    log.error({
      action: "send_transfer",
      reason:
        row.paymentIntentId === null
          ? "no_payment_intent"
          : "author_without_stripe_account",
      orderId,
      orderNumber: orderLabel(row),
      orderItemId: row.orderItemId,
    });

    return "stuck";
  }

  try {
    return canReuseIdempotencyKey(row.firstAttemptAt, now)
      ? await createTransfer(
          db,
          stripe,
          row,
          { paymentIntentId: row.paymentIntentId, destination: row.accountId },
          orderId,
          now
        )
      : await adoptExistingTransfer(db, stripe, row, orderId);
  } catch (error) {
    await db
      .update(transfer)
      .set({
        lastError: error instanceof Error ? error.message : String(error),
      })
      .where(eq(transfer.orderItemId, row.orderItemId));

    return "retry";
  }
};

/**
 * Sends the Author's Transfer for each comic of a paid Order that has none yet. Safe to repeat: a comic already sent is skipped,
 * and a retry within 23 hours reuses the idempotency key, so Stripe hands back the first Transfer instead of making a second.
 * Returns how many are still unsent and worth retrying; a Transfer that needs a person is logged and not counted.
 */
export const sendTransfers = async (
  db: Database,
  stripe: TransferStripe,
  orderId: string,
  now: Date
) => {
  const rows = await unsentTransfers(db, orderId);

  const outcomes = await Promise.all(
    rows.map(async (row) => await sendOne(db, stripe, row, orderId, now))
  );

  return outcomes.filter((outcome) => outcome === "retry").length;
};
