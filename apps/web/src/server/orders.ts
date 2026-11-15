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
        // Stripe's copy of the address wins over the one typed in our form.
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
    // On a replay the rows already exist, so this changes nothing.
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

/**
 * Brings an Order to paid and confirmed. Safe to repeat in any order and after a crash at any point: each step checks its own saved state.
 * It never reads the sales phase or the active Edition, so an OXXO Order paid after the window closed is honoured (story 29).
 * It throws when a step needs a retry.
 */
export const fulfillOrder = async (
  db: Database,
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
  await ensureConfirmed(db, paid.orderId, now);
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
