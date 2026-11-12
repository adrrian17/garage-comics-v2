import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { createAuth } from "@/server/services";

export const getSession = createServerFn({ method: "GET" }).handler(
  async () =>
    await createAuth().api.getSession({ headers: getRequest().headers })
);
