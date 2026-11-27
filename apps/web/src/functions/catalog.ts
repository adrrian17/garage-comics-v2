import { editionComic } from "@garage-comics/db/schema/comics";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { cartIds, droppedIds } from "@/lib/cart";
import { sellableComics } from "@/server/catalog";
import { createDatabase } from "@/server/services";

export const getCatalog = createServerFn({ method: "GET" }).handler(
  async () => await sellableComics(createDatabase(), new Date())
);

// Edition comic ids are UUIDs; anything longer is not one of ours.
export const COMIC_ID_MAX_LENGTH = 64;

/** A comic on sale and the Author's other comics on sale; closed outside sales; null when it is not on sale (unknown or unapproved). */
export const getComicPage = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().max(COMIC_ID_MAX_LENGTH) }))
  .handler(async ({ data }) => {
    const db = createDatabase();
    const now = new Date();
    const found = await sellableComics(db, now, { ids: [data.id] });

    if (found.status === "closed") {
      // Outside sales, only a link to an approved comic is a comic no longer on sale; any other id is a missing page.
      const approved = await db
        .select({ id: editionComic.id })
        .from(editionComic)
        .where(
          and(eq(editionComic.id, data.id), eq(editionComic.status, "approved"))
        )
        .get();

      return approved === undefined ? null : found;
    }

    const [comic] = found.comics;

    if (comic === undefined) {
      return null;
    }

    const byAuthor = await sellableComics(db, now, {
      authorSlug: comic.author.slug,
    });

    return {
      status: "open" as const,
      comic,
      moreByAuthor:
        byAuthor.status === "open"
          ? byAuthor.comics.filter((other) => other.id !== comic.id)
          : [],
    };
  });

/** What the cart holds that can still be bought, priced by the database, and the ids that can no longer be. */
export const getCartLines = createServerFn({ method: "GET" })
  .validator(z.object({ ids: cartIds }))
  .handler(async ({ data }) => {
    if (data.ids.length === 0) {
      return { status: "open" as const, comics: [], dropped: [] };
    }

    const sellable = await sellableComics(createDatabase(), new Date(), {
      ids: data.ids,
    });

    return sellable.status === "closed"
      ? sellable
      : {
          status: "open" as const,
          comics: sellable.comics,
          dropped: droppedIds(data.ids, sellable.comics),
        };
  });
