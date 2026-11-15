import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { user } from "./auth";
import { edition } from "./editions";

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull();

export const comicSlots = ["exclusive", "previous_1", "previous_2"] as const;

export type ComicSlot = (typeof comicSlots)[number];

export const comicStatuses = [
  "draft",
  "in_review",
  "approved",
  "rejected",
] as const;

export type ComicStatus = (typeof comicStatuses)[number];

export interface Collaborator {
  name: string;
  role: string;
  links: string[];
}

// The identity of a comic across Editions; what it contains and whether it was approved lives in `editionComic`.
export const comic = sqliteTable(
  "comic",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    // The target of `editionComic`'s composite key, so a snapshot cannot name another Author's comic.
    uniqueIndex("comic_id_author_idx").on(table.id, table.authorId),
  ]
);

// What one Edition sees of a comic. `revision` moves on every content change and every decision, so a stale screen cannot overwrite either.
export const editionComic = sqliteTable(
  "edition_comic",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    editionId: text("edition_id")
      .notNull()
      .references(() => edition.id),
    comicId: text("comic_id").notNull(),
    authorId: text("author_id").notNull(),
    slot: text("slot", { enum: comicSlots }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    genre: text("genre").notNull(),
    priceMxn: integer("price_mxn").notNull(),
    pageCount: integer("page_count").notNull(),
    collaborators: text("collaborators", { mode: "json" })
      .$type<Collaborator[]>()
      .notNull(),
    coverKey: text("cover_key"),
    pdfKey: text("pdf_key"),
    pdfBytes: integer("pdf_bytes"),
    status: text("status", { enum: comicStatuses }).default("draft").notNull(),
    revision: integer("revision").default(1).notNull(),
    rejectionReason: text("rejection_reason"),
    reviewedBy: text("reviewed_by").references(() => user.id),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.comicId, table.authorId],
      foreignColumns: [comic.id, comic.authorId],
    }),
    // One Exclusive and at most two Previous Works per Author and Edition, even under concurrent requests.
    uniqueIndex("edition_comic_slot_idx").on(
      table.editionId,
      table.authorId,
      table.slot
    ),
    uniqueIndex("edition_comic_edition_comic_idx").on(
      table.editionId,
      table.comicId
    ),
    index("edition_comic_editionId_status_idx").on(
      table.editionId,
      table.status
    ),
    check("edition_comic_price_check", sql`${table.priceMxn} >= 70`),
    check(
      "edition_comic_exclusive_pages_check",
      sql`${table.slot} != 'exclusive' or ${table.pageCount} between 12 and 24`
    ),
    check("edition_comic_pages_check", sql`${table.pageCount} >= 1`),
  ]
);
