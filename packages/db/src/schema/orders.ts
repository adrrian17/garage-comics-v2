import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { editionComic } from "./comics";
import { edition } from "./editions";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

// GRG-1000 is the first Order Number; `lib/order-number.ts` adds the prefix, so only the integer is stored.
const FIRST_ORDER_NUMBER = 1000;

export const orderStatuses = ["pending", "paid", "cancelled"] as const;

export type OrderStatus = (typeof orderStatuses)[number];

// One checkout by a Customer. It is created pending when the Checkout Session opens and gets its number only when the payment is confirmed, so an abandoned checkout or an expired OXXO voucher leaves no hole in the sequence.
export const order = sqliteTable(
  "order",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    number: integer("number"),
    editionId: text("edition_id")
      .notNull()
      .references(() => edition.id),
    // The address the Customer typed in our form; Stripe's own copy wins once the payment is confirmed.
    customerEmail: text("customer_email").notNull(),
    status: text("status", { enum: orderStatuses })
      .default("pending")
      .notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id")
      .notNull()
      .unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    // Null while the confirmation email is still owed.
    confirmationSentAt: integer("confirmation_sent_at", {
      mode: "timestamp_ms",
    }),
    createdAt: createdAt(),
  },
  (table) => [
    // The numbering invariant lives in the database: a replay or a race can fail a write, never duplicate a number.
    uniqueIndex("order_number_idx").on(table.number),
    index("order_editionId_status_idx").on(table.editionId, table.status),
    check(
      "order_paid_check",
      sql`(${table.status} = 'paid') = (${table.number} is not null and ${table.paidAt} is not null)`
    ),
    // sql.raw because a CHECK takes literals, not bound parameters.
    check(
      "order_number_check",
      sql`${table.number} is null or ${table.number} >= ${sql.raw(String(FIRST_ORDER_NUMBER))}`
    ),
  ]
);

// What the Customer bought, frozen at checkout and never updated. The Author's share is `priceCentavos - commissionCentavos`.
export const orderItem = sqliteTable(
  "order_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => order.id),
    editionComicId: text("edition_comic_id")
      .notNull()
      .references(() => editionComic.id),
    title: text("title").notNull(),
    priceCentavos: integer("price_centavos").notNull(),
    commissionCentavos: integer("commission_centavos").notNull(),
  },
  (table) => [
    // A digital comic is bought once per Order.
    uniqueIndex("order_item_order_comic_idx").on(
      table.orderId,
      table.editionComicId
    ),
    check(
      "order_item_commission_check",
      sql`${table.commissionCentavos} >= 0 and ${table.commissionCentavos} < ${table.priceCentavos}`
    ),
  ]
);

// The Transfer owed for one comic sold. The row exists from the moment the Order is paid; `stripeTransferId` stays null until Stripe has the Transfer.
export const transfer = sqliteTable(
  "transfer",
  {
    orderItemId: text("order_item_id")
      .primaryKey()
      .references(() => orderItem.id),
    stripeTransferId: text("stripe_transfer_id").unique(),
    attempts: integer("attempts").default(0).notNull(),
    // Stripe remembers an idempotency key for 24 hours; see `lib/transfers.ts`.
    firstAttemptAt: integer("first_attempt_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (table) => [
    index("transfer_unsent_idx")
      .on(table.createdAt)
      .where(sql`stripe_transfer_id is null`),
  ]
);
