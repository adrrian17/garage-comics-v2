# Server and API

Server code lives inside the TanStack Start app in `apps/web`; there is no separate API Worker.

- `apps/web/src/server.ts`: the Worker entry. Wraps Start's handler with evlog request logging and Better Auth user identification.
- `apps/web/src/server/services.ts`: builds Better Auth and the database from the `cloudflare:workers` env. Only server code imports it.
- `apps/web/src/functions/`: server functions (`createServerFn`). Read the session with `getRequest().headers`; reject unauthenticated calls inside the handler.
- `apps/web/src/routes/api/`: server routes, such as the Better Auth handler at `/api/auth/$`.
- `apps/web/src/routes/api/stripe/webhook.ts`: the Stripe webhook. It verifies the signature, asks `routeCheckoutEvent` (`lib/stripe-events.ts`, the only list of handled events) what the event means, then registers a paid Registration (`server/registrations.ts`) or pays or cancels an Order (`server/orders.ts`). It must stay safe to replay, and it answers 500 when a step needs a retry so Stripe delivers the event again.
- `packages/auth`: Better Auth configuration (`createAuth`).
- Shared packages receive config or initialized clients from the app; they do not read env vars themselves (see [environment](environment.md)).

## Stripe webhook events

Subscribe the endpoint (`/api/stripe/webhook`) to these events in the Stripe Dashboard; any other event is ignored.

- `checkout.session.completed`: a card payment, a Registration, or an OXXO voucher being issued (unpaid, ignored).
- `checkout.session.async_payment_succeeded`: an OXXO voucher paid.
- `checkout.session.async_payment_failed`: an OXXO voucher expired unpaid; the Order is cancelled silently.
- `checkout.session.expired`: a Checkout Session lapsed; the Order is cancelled silently.

Checkout Sessions carry `metadata.kind` (`order` or `registration`) so the webhook can tell them apart. OXXO must also be enabled as a payment method in the Dashboard for the Checkout page to offer it.

## Stripe in development

`pnpm dev` also starts `packages/stripe-emulator`, the `@emulators/stripe` emulator from emulate.dev, on `STRIPE_API_URL`. It sends signed webhooks to the app, so no Stripe account or keys are needed. The emulator keeps its state in memory and does not model every Stripe feature (for example it rejects inline `price_data` and ignores `expires_at`); check its source before relying on a Stripe feature locally.

The emulator implements no `/v1/accounts` or `/v1/account_sessions` (checked in emulate@0.13.1), so the Author payouts page (Stripe Connect onboarding) fails against it. To test onboarding, put real Stripe test-mode keys in `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` and set `STRIPE_API_URL=https://api.stripe.com` in `.env`: an empty value falls back to the emulator default. Stripe webhooks do not reach the local app in this mode, so test with the `ADMIN_EMAIL` account at `/admin/pagos`.

## Skills

- Auth and sessions: `better-auth-best-practices`, `better-auth-security-best-practices`; email/password flows: `email-and-password-best-practices`.
- Logging and audit trails: `review-logging-patterns`, `build-audit-logs`.
