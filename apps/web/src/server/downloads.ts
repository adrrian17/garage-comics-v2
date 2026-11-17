import type { Database } from "@garage-comics/db";
import { downloadCopy, downloadLink } from "@garage-comics/db/schema/downloads";
import { edition } from "@garage-comics/db/schema/editions";
import { order, orderItem } from "@garage-comics/db/schema/orders";
import { env, waitUntil } from "cloudflare:workers";
import { and, asc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { log } from "evlog";

import { downloadLinkExpiry, viewDownloadLink } from "@/lib/download-link";
import type { DownloadLinkView } from "@/lib/download-link";
import { orderTotalCentavos } from "@/lib/order";
import { formatOrderNumber } from "@/lib/order-number";
import {
  downloadLinkResentEmail,
  orderConfirmationEmail,
  sendEmail,
  sendNotification,
} from "@/server/email";

// The only writer of `download_link`, and everything the Customer and the Admin do with it.
// `download_copy` is written only by the Watermarker (server/watermarker.ts); this module reads it.

/** The page a Download Link opens. The id is the secret, like the Proposal id in `registrationUrl`. */
const downloadLinkUrl = (downloadLinkId: string) =>
  `${env.BETTER_AUTH_URL}/descargas/${downloadLinkId}`;

/** Wakes the Watermarker of one Download Link. Idempotent: it only sets an alarm when none is pending. */
const prepareCopies = async (downloadLinkId: string) => {
  await env.WATERMARKER.getByName(downloadLinkId).prepare(downloadLinkId);
};

/** Wakes it without failing the caller: the Customer's next visit to the link wakes it again. */
const tryPrepareCopies = async (action: string, downloadLinkId: string) => {
  try {
    await prepareCopies(downloadLinkId);
  } catch (error) {
    log.warn({
      action,
      reason: "watermarker_not_woken",
      downloadLinkId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

/**
 * Story 34: a new Download Link with its own 24 hours and its own copies, made from scratch.
 * The old link keeps working until its own expiry: nothing is shared (row, R2 key, Watermarker, container), so a resend cannot clobber a job still running.
 */
export const resendDownloadLink = async (
  db: Database,
  admin: { id: string },
  orderId: string,
  now: Date
) => {
  const found = await db
    .select({
      status: order.status,
      number: order.number,
      email: order.customerEmail,
    })
    .from(order)
    .where(eq(order.id, orderId))
    .get();

  if (found?.status !== "paid" || found.number === null) {
    return { status: "not_paid" as const };
  }

  const expiresAt = downloadLinkExpiry(now);

  const [link] = await db
    .insert(downloadLink)
    .values({ orderId, expiresAt, resentBy: admin.id })
    .returning({ id: downloadLink.id });

  if (link === undefined) {
    throw new Error(`Order ${orderId} got no Download Link.`);
  }

  const notified = await sendNotification({
    to: found.email,
    ...downloadLinkResentEmail({
      orderNumber: formatOrderNumber(found.number),
      downloadUrl: downloadLinkUrl(link.id),
      expiresAt,
    }),
  });

  // A link nobody received needs no copies. A failed wake-up is not the Admin's to fix: the Customer opening the link wakes it.
  if (notified) {
    await tryPrepareCopies("resend_download_link", link.id);
  }

  return {
    status: "resent" as const,
    notified,
    email: found.email,
    expiresAt,
  };
};

/**
 * What the Download Link page shows, or null for an unknown link. Every comic of the Order is listed with its copy's state;
 * a comic whose copy row does not exist yet (the Watermarker has not woken) counts as preparing.
 */
export const readDownloadLink = async (
  db: Database,
  downloadLinkId: string,
  now: Date
): Promise<DownloadLinkView | null> => {
  const link = await db
    .select({
      orderId: downloadLink.orderId,
      expiresAt: downloadLink.expiresAt,
      orderNumber: order.number,
    })
    .from(downloadLink)
    .innerJoin(order, eq(order.id, downloadLink.orderId))
    .where(eq(downloadLink.id, downloadLinkId))
    .get();

  if (link?.orderNumber === null || link === undefined) {
    return null;
  }

  const copies = await db
    .select({
      orderItemId: orderItem.id,
      title: orderItem.title,
      readyAt: downloadCopy.readyAt,
      attempts: sql<number>`coalesce(${downloadCopy.attempts}, 0)`,
    })
    .from(orderItem)
    .leftJoin(
      downloadCopy,
      and(
        eq(downloadCopy.orderItemId, orderItem.id),
        eq(downloadCopy.downloadLinkId, downloadLinkId)
      )
    )
    .where(eq(orderItem.orderId, link.orderId))
    .orderBy(asc(orderItem.title));

  const view = viewDownloadLink(
    { orderNumber: link.orderNumber, expiresAt: link.expiresAt },
    copies,
    now
  );

  // The Customer waiting on a copy is the backstop for a Watermarker that lost its alarm. Never awaited: ready comics show even when the wake-up fails.
  if (
    view.status === "open" &&
    view.comics.some((comic) => comic.state === "preparing")
  ) {
    waitUntil(tryPrepareCopies("read_download_link", downloadLinkId));
  }

  return view;
};

/** A copy the Customer may download now: ready, and its link not expired. The expiry is checked here, in D1, never left to the bucket's lifecycle. */
export const findReadyCopy = async (
  db: Database,
  downloadLinkId: string,
  orderItemId: string,
  now: Date
) =>
  await db
    .select({ title: orderItem.title, orderNumber: order.number })
    .from(downloadCopy)
    .innerJoin(downloadLink, eq(downloadLink.id, downloadCopy.downloadLinkId))
    .innerJoin(orderItem, eq(orderItem.id, downloadCopy.orderItemId))
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(
        eq(downloadCopy.downloadLinkId, downloadLinkId),
        eq(downloadCopy.orderItemId, orderItemId),
        isNotNull(downloadCopy.readyAt),
        gt(downloadLink.expiresAt, now)
      )
    )
    .get();
