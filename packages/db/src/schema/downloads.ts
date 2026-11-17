import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { order, orderItem } from "./orders";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

// A Download Link emailed to a Customer for a paid Order. The payment makes the first; every Admin resend makes another, with its own copies and its own 24 hours. The id is the secret in the URL.
export const downloadLink = sqliteTable(
  "download_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id),
    // 24 hours after the latest attempt to send its email, so the window starts when the Customer gets the link (story 33).
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    // The Admin who resent it; null for the one in the Order confirmation.
    resentBy: text("resent_by").references(() => user.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("download_link_orderId_idx").on(table.orderId),
    // One Download Link per Order comes with the payment, so a replayed webhook finds it instead of making a second.
    uniqueIndex("download_link_payment_idx")
      .on(table.orderId)
      .where(sql`resent_by is null`),
  ]
);

// The watermarked copy of one comic sold, made for one Download Link. The file lives in the `downloads` bucket at a key derived from both ids (`copyKey` in apps/web/src/lib/download-link.ts); `readyAt` says it is there.
export const downloadCopy = sqliteTable(
  "download_copy",
  {
    downloadLinkId: text("download_link_id")
      .notNull()
      .references(() => downloadLink.id),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItem.id),
    readyAt: integer("ready_at", { mode: "timestamp_ms" }),
    // Hand-offs to the container, counted before each one so an attempt lost to a crash still counts.
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.downloadLinkId, table.orderItemId] }),
  ]
);
