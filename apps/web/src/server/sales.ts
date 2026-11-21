import type { Database } from "@garage-comics/db";
import { editionComic } from "@garage-comics/db/schema/comics";
import { edition } from "@garage-comics/db/schema/editions";
import { order, orderItem, transfer } from "@garage-comics/db/schema/orders";
import { and, desc, eq, sql } from "drizzle-orm";

import { formatOrderNumber } from "@/lib/order-number";

/** One row per comic of a paid Order that this Author sold, newest Order first. */
export const listAuthorSales = async (db: Database, authorId: string) => {
  const rows = await db
    .select({
      orderItemId: orderItem.id,
      editionName: edition.name,
      paidAt: sql`${order.paidAt}`.mapWith(order.paidAt),
      number: sql<number>`${order.number}`,
      title: orderItem.title,
      priceCentavos: orderItem.priceCentavos,
      commissionCentavos: orderItem.commissionCentavos,
      stripeTransferId: transfer.stripeTransferId,
    })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .innerJoin(editionComic, eq(editionComic.id, orderItem.editionComicId))
    .innerJoin(edition, eq(edition.id, order.editionId))
    .leftJoin(transfer, eq(transfer.orderItemId, orderItem.id))
    .where(and(eq(order.status, "paid"), eq(editionComic.authorId, authorId)))
    .orderBy(desc(order.number));

  return rows.map(({ number, stripeTransferId, ...row }) => ({
    ...row,
    orderNumber: formatOrderNumber(number),
    shareCentavos: row.priceCentavos - row.commissionCentavos,
    transferSent: stripeTransferId !== null,
  }));
};
