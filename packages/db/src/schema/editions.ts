import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const edition = sqliteTable(
  "edition",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    proposalsOpenAt: integer("proposals_open_at", {
      mode: "timestamp_ms",
    }).notNull(),
    proposalsCloseAt: integer("proposals_close_at", {
      mode: "timestamp_ms",
    }).notNull(),
    salesOpenAt: integer("sales_open_at", { mode: "timestamp_ms" }).notNull(),
    salesCloseAt: integer("sales_close_at", { mode: "timestamp_ms" }).notNull(),
    registrationPriceMxn: integer("registration_price_mxn").notNull(),
    isActive: integer("is_active", { mode: "boolean" })
      .default(false)
      .notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("edition_one_active_idx")
      .on(table.isActive)
      .where(sql`is_active = 1`),
  ]
);

export const proposalStatuses = [
  "pending",
  "accepted",
  "rejected",
  "expired",
  "registered",
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number];

export const proposal = sqliteTable(
  "proposal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    editionId: text("edition_id")
      .notNull()
      .references(() => edition.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    portfolioUrl: text("portfolio_url"),
    about: text("about").notNull(),
    status: text("status", { enum: proposalStatuses })
      .default("pending")
      .notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (table) => [
    index("proposal_editionId_status_idx").on(table.editionId, table.status),
    // One open Proposal per email and Edition; rejected or expired ones free the email again.
    uniqueIndex("proposal_one_open_per_email_idx")
      .on(table.editionId, table.email)
      .where(sql`status in ('pending', 'accepted', 'registered')`),
  ]
);

// The record of which Editions an Author can sell in. `proposalId` is unique so a replayed payment webhook cannot register twice.
export const registration = sqliteTable(
  "registration",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    editionId: text("edition_id")
      .notNull()
      .references(() => edition.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    proposalId: text("proposal_id")
      .notNull()
      .unique()
      .references(() => proposal.id),
    amountMxn: integer("amount_mxn").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id")
      .notNull()
      .unique(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("registration_edition_user_idx").on(
      table.editionId,
      table.userId
    ),
    index("registration_userId_idx").on(table.userId),
  ]
);
