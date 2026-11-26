import type { Database } from "@garage-comics/db";
import { authorProfile } from "@garage-comics/db/schema/authors";
import type { Collaborator } from "@garage-comics/db/schema/comics";
import { editionComic } from "@garage-comics/db/schema/comics";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { editionPhase } from "@/lib/edition";
import { findActiveEdition } from "@/server/editions";

/** What a Customer may see of a comic. It has no field for a file key, an account id or a user id, so none can leak. */
export interface SellableComic {
  id: string;
  title: string;
  description: string;
  genre: string;
  priceMxn: number;
  pageCount: number;
  hasCover: boolean;
  author: { slug: string; displayName: string };
  /** Credited people without an account; the Author enters their names, roles and links for the public to see. */
  collaborators: Collaborator[];
}

type Sellable =
  | { status: "closed" }
  | {
      status: "open";
      edition: { id: string; name: string };
      comics: SellableComic[];
    };

/**
 * The one definition of "sellable": an approved comic of the active Edition, whose Author has a ready Stripe account, while the Edition is in `sales`.
 * The landing, the Author page, the cart and the checkout all read it, so they cannot disagree.
 */
export const sellableComics = async (
  db: Database,
  now: Date,
  filter: { authorSlug?: string; ids?: string[] } = {}
): Promise<Sellable> => {
  const edition = await findActiveEdition(db);

  if (edition === undefined || editionPhase(edition, now) !== "sales") {
    return { status: "closed" };
  }

  const rows = await db
    .select({
      id: editionComic.id,
      title: editionComic.title,
      description: editionComic.description,
      genre: editionComic.genre,
      priceMxn: editionComic.priceMxn,
      pageCount: editionComic.pageCount,
      collaborators: editionComic.collaborators,
      hasCover: sql<number>`${editionComic.coverKey} is not null`,
      slug: authorProfile.slug,
      displayName: authorProfile.displayName,
    })
    .from(editionComic)
    // No join on `registration`: Admins sell without one.
    .innerJoin(authorProfile, eq(authorProfile.userId, editionComic.authorId))
    .where(
      and(
        eq(editionComic.editionId, edition.id),
        eq(editionComic.status, "approved"),
        eq(authorProfile.payoutSetupStatus, "ready"),
        filter.authorSlug === undefined
          ? undefined
          : eq(authorProfile.slug, filter.authorSlug),
        filter.ids === undefined
          ? undefined
          : inArray(editionComic.id, filter.ids)
      )
    )
    .orderBy(asc(editionComic.title), asc(editionComic.id));

  return {
    status: "open",
    edition: { id: edition.id, name: edition.name },
    comics: rows.map(({ hasCover, slug, displayName, ...comic }) => ({
      ...comic,
      hasCover: Boolean(hasCover),
      author: { slug, displayName },
    })),
  };
};
