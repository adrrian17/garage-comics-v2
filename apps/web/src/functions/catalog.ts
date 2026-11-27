import { createServerFn } from "@tanstack/react-start";
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
      return found;
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
