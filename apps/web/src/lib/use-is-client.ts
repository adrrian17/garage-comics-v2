import { useSyncExternalStore } from "react";

const subscribeNothing = () => () => {
  // The value never changes, so there is nothing to unsubscribe from.
};

/** False while server rendering and hydrating, true afterwards, so browser-only widgets never cause a hydration mismatch. */
export const useIsClient = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );
