import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";

import { createAuth } from "@/server/services";

const readSession = async () =>
  await createAuth().api.getSession({ headers: getRequest().headers });

export const getSession = createServerFn({ method: "GET" }).handler(
  readSession
);

export const getPrivateData = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await readSession();

    if (!session) {
      setResponseStatus(401);
      throw new Error("Unauthorized");
    }

    return { message: "This is private", user: session.user };
  }
);
