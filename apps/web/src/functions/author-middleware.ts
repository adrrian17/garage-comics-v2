import { authorProfile } from "@garage-comics/db/schema/authors";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { createAuth, createDatabase } from "@/server/services";

export const authorMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await createAuth().api.getSession({
      headers: getRequest().headers,
    });

    // An Admin is an Author too once they have a profile.
    const profile =
      session === null
        ? undefined
        : await createDatabase()
            .select({ userId: authorProfile.userId })
            .from(authorProfile)
            .where(eq(authorProfile.userId, session.user.id))
            .get();

    if (session === null || profile === undefined) {
      setResponseStatus(403);
      throw new Error("Solo los Autores pueden hacer esto.");
    }

    return await next({ context: { session } });
  }
);
