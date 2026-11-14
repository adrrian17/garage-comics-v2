import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

// The public page of an Author. Every link is nullable and holds an http(s) URL.
// `stripe_account_id` is the exception: it is private and must never be selected for the public page.
export const authorProfile = sqliteTable(
  "author_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    displayName: text("display_name").notNull(),
    role: text("role").default("").notNull(),
    bio: text("bio").default("").notNull(),
    instagramUrl: text("instagram_url"),
    xUrl: text("x_url"),
    facebookUrl: text("facebook_url"),
    portfolioUrl: text("portfolio_url"),
    // The Author's Stripe Connect account, created on their first visit to the payouts page.
    stripeAccountId: text("stripe_account_id"),
  },
  // An index rather than a column constraint, so adding it does not rebuild the table.
  (table) => [
    uniqueIndex("author_profile_stripe_account_id_idx").on(
      table.stripeAccountId
    ),
  ]
);
