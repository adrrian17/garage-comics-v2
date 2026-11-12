# Garage Comics

A limited-time store for digital comics by Mexican authors: one TanStack Start app on Cloudflare Workers, Drizzle on D1.

- Package manager: **pnpm** (workspaces; versions in the `pnpm-workspace.yaml` catalog).
- Toolchain: **Vite+** (`vp`). Lint and format rules live in `vite.config.ts`; there is no ESLint, Prettier or Biome config.
- Domain terms: use `GLOSSARY.md` words in code, UI copy and docs; avoid the synonyms it lists.

## Commands

- `pnpm fix`: format and autofix lint.
- Done means all three pass, the same as CI: `pnpm knip && pnpm check && pnpm build`.

## Never

- Never read, print or commit values from `.env` or `.env.production`.
- Never run `pnpm deploy`, `pnpm destroy` or `alchemy` unless asked; they change real Cloudflare resources.
- Never edit a committed migration or any `snapshot.json`.

## Read when relevant

- [Code style](docs/agents/code-style.md): rules lint cannot check, and lint suppressions.
- [Frontend](docs/agents/frontend.md): `apps/web`, `packages/ui`, routes, components.
- [Server and API](docs/agents/server-and-api.md): server functions, server routes, `packages/auth`.
- [Database](docs/agents/database.md): `packages/db`, schema, migrations.
- [Environment](docs/agents/environment.md): env vars, `.env.schema`, Varlock.
- [Deployment](docs/agents/deployment.md): `packages/infra`, Alchemy.
- Product scope: `docs/specs/`. Decisions: `docs/adr/`.
