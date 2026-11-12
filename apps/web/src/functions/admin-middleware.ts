import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";

import { createAuth } from "@/server/services";

export const adminMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await createAuth().api.getSession({
      headers: getRequest().headers,
    });

    if (session?.user.role !== "admin") {
      setResponseStatus(403);
      throw new Error("Solo los Administradores pueden hacer esto.");
    }

    return await next({ context: { session } });
  }
);
