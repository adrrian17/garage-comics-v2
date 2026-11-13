import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createRegistrationCheckout,
  findRegistrationOffer,
} from "@/server/registrations";
import { createDatabase } from "@/server/services";

const proposalLink = z.object({ proposalId: z.string() });

export const getRegistrationOffer = createServerFn({ method: "GET" })
  .validator(proposalLink)
  .handler(
    async ({ data }) =>
      await findRegistrationOffer(createDatabase(), data.proposalId, new Date())
  );

export const startRegistrationCheckout = createServerFn({ method: "POST" })
  .validator(proposalLink)
  .handler(async ({ data }) => {
    const url = await createRegistrationCheckout(
      createDatabase(),
      data.proposalId,
      new Date()
    );

    return url === null
      ? { status: "unavailable" as const }
      : { status: "checkout" as const, url };
  });
