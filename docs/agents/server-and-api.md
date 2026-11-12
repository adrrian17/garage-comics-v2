# Server and API

Server code lives inside the TanStack Start app in `apps/web`; there is no separate API Worker.

- `apps/web/src/server.ts`: the Worker entry. Wraps Start's handler with evlog request logging and Better Auth user identification.
- `apps/web/src/server/services.ts`: builds Better Auth and the database from the `cloudflare:workers` env. Only server code imports it.
- `apps/web/src/functions/`: server functions (`createServerFn`). Read the session with `getRequest().headers`; reject unauthenticated calls inside the handler.
- `apps/web/src/routes/api/`: server routes, such as the Better Auth handler at `/api/auth/$`.
- `packages/auth`: Better Auth configuration (`createAuth`).
- Shared packages receive config or initialized clients from the app; they do not read env vars themselves (see [environment](environment.md)).

## Skills

- Auth and sessions: `better-auth-best-practices`, `better-auth-security-best-practices`; email/password flows: `email-and-password-best-practices`.
- Logging and audit trails: `review-logging-patterns`, `build-audit-logs`.
