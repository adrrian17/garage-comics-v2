# Server and API

Server code lives inside the TanStack Start app in `apps/web`; there is no separate API Worker.

- `apps/web/src/server.ts`: the Worker entry. Wraps Start's handler with evlog request logging and Better Auth user identification.
- `apps/web/src/server/services.ts`: builds Better Auth and the database from the `cloudflare:workers` env. Only server code imports it.
- `apps/web/src/functions/`: server functions (`createServerFn`). Read the session with `getRequest().headers`; reject unauthenticated calls inside the handler.
- `apps/web/src/routes/api/`: server routes, such as the Better Auth handler at `/api/auth/$`.
- `apps/web/src/routes/api/stripe/webhook.ts`: the Stripe webhook. It verifies the signature and registers a paid Registration (`server/registrations.ts`); it must stay safe to replay.
- `packages/auth`: Better Auth configuration (`createAuth`).
- Shared packages receive config or initialized clients from the app; they do not read env vars themselves (see [environment](environment.md)).

## Stripe in development

`pnpm dev` also starts `packages/stripe-emulator`, the `@emulators/stripe` emulator from emulate.dev, on `STRIPE_API_URL`. It sends signed webhooks to the app, so no Stripe account or keys are needed. The emulator keeps its state in memory and does not model every Stripe feature (for example it rejects inline `price_data` and ignores `expires_at`); check its source before relying on a Stripe feature locally.

## Skills

- Auth and sessions: `better-auth-best-practices`, `better-auth-security-best-practices`; email/password flows: `email-and-password-best-practices`.
- Logging and audit trails: `review-logging-patterns`, `build-audit-logs`.
