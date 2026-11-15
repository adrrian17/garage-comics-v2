import type { Database } from "@garage-comics/db";
import { edition } from "@garage-comics/db/schema/editions";
import {
  FIRST_ORDER_NUMBER,
  order,
  orderItem,
  transfer,
} from "@garage-comics/db/schema/orders";
import { and, asc, eq, exists, inArray, isNull, sql } from "drizzle-orm";
import { log } from "evlog";

import {
  cancellableStatuses,
  orderTotalCentavos,
  payableStatuses,
} from "@/lib/order";
import { formatOrderNumber } from "@/lib/order-number";
import type { PaidOrder } from "@/lib/stripe-events";
import { orderConfirmationEmail, sendEmail } from "@/server/email";
import { sendTransfers } from "@/server/transfers";
import type { TransferStripe } from "@/server/transfers";

/**
 * Marks the Order paid, gives it the next Order Number and creates the rows for the Transfers it owes, in one batch.
 * The number is taken inside the same UPDATE that changes the status, so nothing can slip in between choosing it and using it (D1 runs one query at a time), and a failed batch rolls both back.
 * A replayed event matches no row, so it takes no number; the unique index on `number` is the backstop.
 */
const ensurePaid = async (db: Database, paid: PaidOrder, now: Date) => {
  await db.batch([
    db
      .update(order)
      .set({
        status: "paid",
        paidAt: now,
        stripePaymentIntentId: paid.paymentIntentId,
        customerEmail: sql`coalesce(${paid.email}, ${order.customerEmail})`,
        number: sql`(select coalesce(max(number), ${FIRST_ORDER_NUMBER - 1}) + 1 from "order")`,
      })
      .where(
        and(
          eq(order.id, paid.orderId),
          eq(order.stripeCheckoutSessionId, paid.sessionId),
          inArray(order.status, payableStatuses)
        )
      ),
    db
      .insert(transfer)
      .select(
        db
          .select({ orderItemId: orderItem.id })
          .from(orderItem)
          .where(
            and(
              eq(orderItem.orderId, paid.orderId),
              exists(
                db
                  .select({ one: sql`1` })
                  .from(order)
                  .where(
                    and(eq(order.id, paid.orderId), eq(order.status, "paid"))
                  )
              )
            )
          )
      )
      .onConflictDoNothing(),
  ]);
};

/**
 * Sends the confirmation once the Order is paid. The email goes out before it is marked sent, so a crash in between sends it twice rather than never.
 * It throws when the send fails, which makes the webhook answer 500 and Stripe deliver the event again.
 */
const ensureConfirmed = async (db: Database, orderId: string, now: Date) => {
  const found = await db
    .select({
      status: order.status,
      number: order.number,
      email: order.customerEmail,
      confirmationSentAt: order.confirmationSentAt,
      editionName: edition.name,
    })
    .from(order)
    .innerJoin(edition, eq(edition.id, order.editionId))
    .where(eq(order.id, orderId))
    .get();

  if (found?.status !== "paid" || found.number === null) {
    throw new Error(
      `Order ${orderId} is not paid after its payment was recorded.`
    );
  }

  if (found.confirmationSentAt !== null) {
    return;
  }

  const items = await db
    .select({ title: orderItem.title, priceCentavos: orderItem.priceCentavos })
    .from(orderItem)
    .where(eq(orderItem.orderId, orderId))
    .orderBy(asc(orderItem.title));

  await sendEmail({
    to: found.email,
    ...orderConfirmationEmail({
      orderNumber: formatOrderNumber(found.number),
      editionName: found.editionName,
      items,
      totalCentavos: orderTotalCentavos(items),
    }),
  });

  await db
    .update(order)
    .set({ confirmationSentAt: now })
    .where(and(eq(order.id, orderId), isNull(order.confirmationSentAt)));
};

/** Sends the Author's Transfers; throws while some are unsent and worth retrying, so the webhook answers 500 and Stripe delivers the event again. */
const ensureTransfers = async (
  db: Database,
  stripe: TransferStripe,
  orderId: string,
  now: Date
) => {
  const unsent = await sendTransfers(db, stripe, orderId, now);

  if (unsent > 0) {
    throw new Error(
      `${unsent} Transfer(s) of Order ${orderId} are still unsent.`
    );
  }
};

/**
 * Brings an Order to paid, confirmed and transferred. Safe to repeat in any order and after a crash at any point: each step checks its own saved state.
 * Payment is saved first. Only then do the email and the Transfers run, independently, so an email outage never holds back an Author's money and a Stripe error never holds back the email.
 * It never reads the sales phase or the active Edition, so an OXXO Order paid after the window closed is honoured (story 29).
 * It throws when a step needs a retry.
 */
export const fulfillOrder = async (
  db: Database,
  stripe: TransferStripe,
  paid: PaidOrder,
  now: Date
) => {
  const found = await db
    .select({ status: order.status })
    .from(order)
    .where(eq(order.id, paid.orderId))
    .get();

  // A payment for an Order we do not have: fail loudly so Stripe keeps retrying instead of the money going unnoticed.
  if (found === undefined) {
    throw new Error(
      `Paid Checkout Session ${paid.sessionId} has no Order ${paid.orderId}.`
    );
  }

  if (found.status === "cancelled") {
    log.warn({
      action: "fulfill_order",
      reason: "paid_after_cancel",
      orderId: paid.orderId,
    });
  }

  await ensurePaid(db, paid, now);

  const steps = await Promise.allSettled([
    ensureConfirmed(db, paid.orderId, now),
    ensureTransfers(db, stripe, paid.orderId, now),
  ]);

  const failures = steps.flatMap((step) =>
    step.status === "rejected"
      ? [
          step.reason instanceof Error
            ? step.reason.message
            : String(step.reason),
        ]
      : []
  );

  if (failures.length > 0) {
    throw new Error(failures.join("; "));
  }
};

/** Cancels an Order that is still pending, silently (story 31). A paid or unknown Order is left alone. */
export const cancelOrder = async (
  db: Database,
  orderId: string,
  sessionId: string
) => {
  await db
    .update(order)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(order.id, orderId),
        eq(order.stripeCheckoutSessionId, sessionId),
        inArray(order.status, cancellableStatuses)
      )
    );
};
