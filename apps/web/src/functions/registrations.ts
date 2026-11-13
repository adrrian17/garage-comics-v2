import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  createRegistrationCheckout,
  findRegistrationOffer,
  registerAdminForFree,
} from "@/server/registrations";
import { createAuth, createDatabase } from "@/server/services";

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

export const registerFree = createServerFn({ method: "POST" })
  .validator(proposalLink)
  .handler(async ({ data }) => {
    const session = await createAuth().api.getSession({
      headers: getRequest().headers,
    });

    const registered =
      session !== null &&
      (await registerAdminForFree(
        createDatabase(),
        data.proposalId,
        session.user,
        new Date()
      ));

    return registered
      ? { status: "registered" as const }
      : { status: "unavailable" as const };
  });
