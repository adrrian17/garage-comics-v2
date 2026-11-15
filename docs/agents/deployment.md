# Deployment

`packages/infra/alchemy.run.ts` defines the Cloudflare resources (the TanStack Start Worker, D1 and the `comics` R2 bucket) and the migrations folder Alchemy applies on deploy.

- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` commands unless asked; they change real Cloudflare resources.
- `pnpm deploy` runs with `APP_ENV=production` and defaults to a personal `dev_<username>` stage. Production uses an explicit stage: `cd packages/infra && pnpm exec alchemy deploy --stage production`.
- `apps/web/cloudflare-env.d.ts` is hand-written; it infers Worker binding types from `alchemy.run.ts`.
- The `comics` bucket holds covers and PDFs. Browsers upload parts straight to it through presigned URLs, so its CORS allows any origin; the Worker reads and signs with the `COMICS` binding and the `COMICS_S3` credentials (a bucket-scoped API token Alchemy mints on deploy). Under `alchemy dev` both run against a local emulation.
