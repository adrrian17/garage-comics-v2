import { useSyncExternalStore } from "react";

import { addToCart, parseStoredCart, removeFromCart } from "@/lib/cart";

const STORAGE_KEY = "garage-comics-cart";

const NO_IDS: string[] = [];

// The cart lives here, so it still works when localStorage throws (private windows, blocked site data); storage only carries it between visits and tabs.
let stored: string | null | undefined;

interface CartSnapshot {
  raw: string | null;
  ids: string[];
}

let snapshot: CartSnapshot = { raw: null, ids: NO_IDS };

const listeners = new Set<() => void>();

const readStorage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const getSnapshot = () => {
  stored ??= readStorage();

  // useSyncExternalStore needs the same array until the cart changes.
  if (snapshot.raw !== stored) {
    snapshot = { raw: stored, ids: parseStoredCart(stored) };
  }

  return snapshot.ids;
};

const getServerSnapshot = () => NO_IDS;

const subscribe = (listener: () => void) => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      stored = readStorage();
      listener();
    }
  };

  listeners.add(listener);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};

const save = (ids: string[]) => {
  stored = JSON.stringify(ids);

  try {
    localStorage.setItem(STORAGE_KEY, stored);
  } catch {
    // The in-memory copy keeps this visit working.
  }

  notify();
};

const add = (id: string) => {
  save(addToCart(getSnapshot(), id));
};

const remove = (removed: string[]) => {
  save(removeFromCart(getSnapshot(), removed));
};

const clear = () => {
  save([]);
};

/** The cart: a list of comic ids kept in this browser. The server decides what they cost and whether they still sell. */
export const useCart = () => ({
  ids: useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
  add,
  remove,
  clear,
});
