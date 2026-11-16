import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { cartIds, droppedIds } from "@/lib/cart";
import { sellableComics } from "@/server/catalog";
import { createDatabase } from "@/server/services";

export const getCatalog = createServerFn({ method: "GET" }).handler(
  async () => await sellableComics(createDatabase(), new Date())
);

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
