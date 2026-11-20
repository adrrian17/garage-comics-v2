# Deployment

`packages/infra/alchemy.run.ts` defines the Cloudflare resources (the TanStack Start Worker, D1, the `comics` and `downloads` R2 buckets and the Watermarker container) and the migrations folder Alchemy applies on deploy.

- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` commands unless asked; they change real Cloudflare resources.
- `pnpm deploy` runs with `APP_ENV=production` and defaults to a personal `dev_<username>` stage. Production uses an explicit stage: `cd packages/infra && pnpm exec alchemy deploy --stage production`.
- `apps/web/cloudflare-env.d.ts` is hand-written; it infers Worker binding types from `alchemy.run.ts`.
- The Worker's `main` is `apps/web/src/server.ts`, which wraps Start's handler and exports the `Watermarker` Durable Object class. Cloudflare finds a Durable Object class only among the entry's exports.
- The `comics` bucket holds covers and PDFs. Browsers upload parts straight to it through presigned URLs, so its CORS allows any origin; the Worker reads and signs with the `COMICS` binding and the `COMICS_S3` credentials (a bucket-scoped API token Alchemy mints on deploy). Under `alchemy dev` both run against a local emulation.
- The `downloads` bucket holds only watermarked copies; its lifecycle rule deletes every object a day after it is written, so originals must never go there. A Download Link's 24 hours are enforced in D1, not by the rule.
- The Watermarker container (`containers/watermarker`, Python with pikepdf) needs the Workers Paid plan. `alchemy dev` builds and runs it with local Docker, so start Docker before `pnpm dev`. The image build runs `stamp.py --self-check`. After changing `stamp.py`, run `python3 containers/watermarker/fixture/measure.py` (needs pikepdf and poppler) and keep every page passing.
- `WATERMARKER` is typed from the `WatermarkerRpc` interface in `alchemy.run.ts`, which the class implements. Never type the binding with the class itself: `Cloudflare.Env` then depends on itself and other bindings silently become `any`.
