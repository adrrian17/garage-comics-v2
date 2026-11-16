import { describe, expect, it } from "vite-plus/test";

import {
  CART_MAX_ITEMS,
  addToCart,
  cartIds,
  droppedIds,
  parseStoredCart,
  removeFromCart,
} from "./cart";

const manyIds = (count: number) =>
  Array.from({ length: count }, (_item, index) => `comic-${index}`);

describe(parseStoredCart, () => {
  it("is empty when nothing was stored", () => {
    expect(parseStoredCart(null)).toStrictEqual([]);
  });

  it.each(["", "{", "not json", '{"ids":["a"]}', '"a"', "42", "null"])(
    "is empty when the stored value is garbage: %s",
    (raw) => {
      expect(parseStoredCart(raw)).toStrictEqual([]);
    }
  );

  it("keeps the ids and drops what is not a non-empty string", () => {
    expect(
      parseStoredCart('["a", 1, null, "", {"id": "b"}, "c"]')
    ).toStrictEqual(["a", "c"]);
  });

  it("drops repeated ids", () => {
    expect(parseStoredCart('["a", "b", "a"]')).toStrictEqual(["a", "b"]);
  });

  it("keeps at most CART_MAX_ITEMS ids", () => {
    expect(
      parseStoredCart(JSON.stringify(manyIds(CART_MAX_ITEMS + 5)))
    ).toStrictEqual(manyIds(CART_MAX_ITEMS));
  });
});

describe(addToCart, () => {
  it("appends a new id", () => {
    expect(addToCart(["a"], "b")).toStrictEqual(["a", "b"]);
  });

  it("changes nothing when the comic is already in the cart", () => {
    expect(addToCart(["a", "b"], "a")).toStrictEqual(["a", "b"]);
  });

  it("refuses more once the cart is full", () => {
    const full = manyIds(CART_MAX_ITEMS);

    expect(addToCart(full, "one-more")).toStrictEqual(full);
  });

  it("does not modify the cart it was given", () => {
    const ids = ["a"];

    addToCart(ids, "b");

    expect(ids).toStrictEqual(["a"]);
  });
});

describe(removeFromCart, () => {
  it("removes the given ids and keeps the rest in order", () => {
    expect(removeFromCart(["a", "b", "c"], ["b", "x"])).toStrictEqual([
      "a",
      "c",
    ]);
  });
});

describe(droppedIds, () => {
  it("lists the ids the server did not return, in cart order", () => {
    expect(droppedIds(["a", "b", "c"], [{ id: "b" }])).toStrictEqual([
      "a",
      "c",
    ]);
  });

  it("is empty when every id is still on sale", () => {
    expect(droppedIds(["a"], [{ id: "a" }])).toStrictEqual([]);
  });
});

describe("the ids a request may carry", () => {
  it("accepts a list within the limit", () => {
    expect(cartIds.safeParse(manyIds(CART_MAX_ITEMS)).success).toBeTruthy();
  });

  it("rejects a list over the limit, an empty id and a non-list", () => {
    expect(cartIds.safeParse(manyIds(CART_MAX_ITEMS + 1)).success).toBeFalsy();
    expect(cartIds.safeParse([""]).success).toBeFalsy();
    expect(cartIds.safeParse("a").success).toBeFalsy();
  });
});
