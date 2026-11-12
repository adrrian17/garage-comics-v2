import { createFileRoute } from "@tanstack/react-router";

import { createAuth } from "@/server/services";

const handleAuth = async ({ request }: { request: Request }) =>
  await createAuth().handler(request);

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
    },
  },
});
