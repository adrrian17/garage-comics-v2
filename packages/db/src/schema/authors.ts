import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

// The public page of an Author. Every link is nullable and holds an http(s) URL.
export const authorProfile = sqliteTable("author_profile", {
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
});
