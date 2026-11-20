import handler from "@tanstack/react-start/server-entry";
import { createAuthMiddleware } from "evlog/better-auth";
import { initWorkersLogger, withEvlog } from "evlog/workers";

import { createAuth } from "@/server/services";

// The Worker entry (`main` in packages/infra/alchemy.run.ts). Cloudflare finds a Durable Object class only among this module's exports.
export { Watermarker } from "@/server/watermarker";

initWorkersLogger({
  env: { service: "garage-comics" },
});

const identifyUser = createAuthMiddleware(createAuth(), {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

export default withEvlog(async (request, _env, _ctx, log) => {
  await identifyUser(log, request.headers, new URL(request.url).pathname);

  return await handler.fetch(request);
});
