import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";

import { createAuth } from "@/server/services";

export const authorMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await createAuth().api.getSession({
      headers: getRequest().headers,
    });

    if (session?.user.role !== "author") {
      setResponseStatus(403);
      throw new Error("Solo los Autores pueden hacer esto.");
    }

    return await next({ context: { session } });
  }
);
