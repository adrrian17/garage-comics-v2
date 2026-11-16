import { z } from "zod";

/** A cart this size already costs a long Stripe Checkout Session and a long URL. */
export const CART_MAX_ITEMS = 20;

/** The ids a request may carry: the server reads prices from the database, so an id is all the client ever sends. */
export const cartIds = z.array(z.string().min(1)).max(CART_MAX_ITEMS);

const storedCart = z.array(z.unknown());

/** Reads what a past visit left in localStorage. Anything that is not a list of ids is dropped, and so is the excess. */
export const parseStoredCart = (raw: string | null): string[] => {
  if (raw === null) {
    return [];
  }

  try {
    const ids = storedCart
      .parse(JSON.parse(raw))
      .filter((id): id is string => typeof id === "string" && id !== "");

    return [...new Set(ids)].slice(0, CART_MAX_ITEMS);
  } catch {
    return [];
  }
};

/** A digital comic is bought once per Order, so adding it twice changes nothing; a full cart refuses more. */
export const addToCart = (ids: readonly string[], id: string): string[] =>
  ids.includes(id) || ids.length >= CART_MAX_ITEMS ? [...ids] : [...ids, id];

export const removeFromCart = (
  ids: readonly string[],
  removed: readonly string[]
): string[] => {
  const gone = new Set(removed);

  return ids.filter((id) => !gone.has(id));
};

/** The ids the server no longer sells, in the order the Customer added them. */
export const droppedIds = (
  ids: readonly string[],
  found: readonly { id: string }[]
): string[] => {
  const sellable = new Set(found.map((comic) => comic.id));

  return ids.filter((id) => !sellable.has(id));
};
