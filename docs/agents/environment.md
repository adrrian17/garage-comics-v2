# Environment

Env vars are managed with Varlock. Load the `varlock` skill before changing them.

- Every var is declared once in the root `.env.schema`. Apps and packages import what they use with `@import(../../, pick=[...])` in their own `.env.schema`.
- `packages/db/src/env.ts` is generated and git-ignored. After changing a schema, run `pnpm env:generate`; never edit `env.ts` by hand.
- Worker code in `apps/web` reads its bindings from `cloudflare:workers`; Alchemy validates the inputs with Varlock at deploy time and passes them in as bindings (`packages/infra/alchemy.run.ts`).
- Development needs no `.env`: the schema provides defaults when `APP_ENV=development`. Production values must be set explicitly.
- Never read, print or commit values from `.env` or `.env.production`. Inspect the schema instead.
