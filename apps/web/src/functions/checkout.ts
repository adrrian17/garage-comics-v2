import { createServerFn } from "@tanstack/react-start";

import { checkoutInput } from "@/lib/checkout";
import { createOrderCheckout } from "@/server/checkout";
import { createDatabase, createStripe } from "@/server/services";

// Open to anyone: a Customer has no account. The input carries ids and an email only, and the server prices everything.
export const startCheckout = createServerFn({ method: "POST" })
  .validator(checkoutInput)
  .handler(
    async ({ data }) =>
      await createOrderCheckout(
        createDatabase(),
        createStripe(),
        data,
        new Date()
      )
  );
