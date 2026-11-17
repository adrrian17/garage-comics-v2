import type { Database } from "@garage-comics/db";
import { downloadLink } from "@garage-comics/db/schema/downloads";
import { edition } from "@garage-comics/db/schema/editions";
import { order, orderItem } from "@garage-comics/db/schema/orders";
import { env } from "cloudflare:workers";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { downloadLinkExpiry } from "@/lib/download-link";
import { orderTotalCentavos } from "@/lib/order";
import { formatOrderNumber } from "@/lib/order-number";
import { orderConfirmationEmail, sendEmail } from "@/server/email";

// The only writer of `download_link`, and everything the Customer and the Admin do with it.
// `download_copy` is written only by the Watermarker (server/watermarker.ts); this module reads it.

/** The page a Download Link opens. The id is the secret, like the Proposal id in `registrationUrl`. */
const downloadLinkUrl = (downloadLinkId: string) =>
  `${env.BETTER_AUTH_URL}/descargas/${downloadLinkId}`;

/** Wakes the Watermarker of one Download Link. Idempotent: it only sets an alarm when none is pending. */
const prepareCopies = async (downloadLinkId: string) => {
  await env.WATERMARKER.getByName(downloadLinkId).prepare(downloadLinkId);
};

/**
 * Gives the Order its payment Download Link, or finds it, and starts its 24 hours at `now`, taken at the edge right before the
 * email that carries the link: the clock starts milliseconds to seconds before the Customer gets it.
 * A retried send moves the window to the email the Customer actually gets; `max` keeps a slower, older retry from moving it back.
 * The partial unique index keeps it to one link: a replay gets the same id, and a duplicate email the same link.
 */
const openPaymentDownloadLink = async (
  db: Database,
  orderId: string,
  now: Date
) => {
  const [link] = await db
    .insert(downloadLink)
    .values({ orderId, expiresAt: downloadLinkExpiry(now) })
    .onConflictDoUpdate({
      target: downloadLink.orderId,
      targetWhere: sql`resent_by is null`,
      set: {
        expiresAt: sql`max(${downloadLink.expiresAt}, excluded.expires_at)`,
      },
    })
    .returning({ id: downloadLink.id, expiresAt: downloadLink.expiresAt });

  if (link === undefined) {
    throw new Error(`Order ${orderId} got no Download Link.`);
  }

  return link;
};

/**
 * Sends the Order confirmation with its Download Link, then starts the watermarked copies it points to (stories 30, 32, 33).
 * The email goes out before it is marked sent, so a crash sends it twice rather than never, both times with the same link.
 * The copies start only after the email, once the link's 24 hours have started, so every copy is written after its link's clock started
 * and the `downloads` bucket's one-day lifecycle never deletes a copy its link still serves, however late the email went out.
 * Throws when a step needs a retry, which makes the webhook answer 500 and Stripe deliver the event again.
 */
export const ensureDelivered = async (
  db: Database,
  orderId: string,
  now: Date
) => {
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

  if (found.confirmationSentAt === null) {
    const link = await openPaymentDownloadLink(db, orderId, now);

    const items = await db
      .select({
        title: orderItem.title,
        priceCentavos: orderItem.priceCentavos,
      })
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
        downloadUrl: downloadLinkUrl(link.id),
        expiresAt: link.expiresAt,
      }),
    });

    await db
      .update(order)
      .set({ confirmationSentAt: now })
      .where(and(eq(order.id, orderId), isNull(order.confirmationSentAt)));
  }

  const link = await db
    .select({ id: downloadLink.id })
    .from(downloadLink)
    .where(
      and(eq(downloadLink.orderId, orderId), isNull(downloadLink.resentBy))
    )
    .get();

  // Missing only for an Order confirmed before Download Links existed; an Admin resend covers those.
  if (link !== undefined) {
    await prepareCopies(link.id);
  }
};
