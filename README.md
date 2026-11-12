# Garage Comics

A limited-time store for digital comics by Mexican authors. One TanStack Start app on Cloudflare Workers; see `docs/adr/0001-cloudflare-platform.md`.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - Server-rendered React with file-based routing and server functions
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **Cloudflare D1** - Database engine
- **Authentication** - Better-Auth
- **Vite+** - Unified Vite toolchain, workspace task runner, linting, and formatting

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses Cloudflare D1 (SQLite) with Drizzle ORM.

Runtime database access uses the Cloudflare `DB` binding from `packages/infra/alchemy.run.ts`. If a local `DATABASE_URL` is present, it is only for database tooling.

Alchemy provisions the D1 database and applies migrations during `deploy`.

1. Generate migration files:

```bash
pnpm run db:generate
```

Then, run the development server:

```bash
pnpm run dev
```

`pnpm dev` runs through [portless](https://github.com/vercel-labs/portless), which picks a free port and serves the app at [https://garage-comics.localhost](https://garage-comics.localhost). Pages, server functions and the Better Auth API (`/api/auth/*`) are served by the same Worker.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@garage-comics/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

Every env var is declared once in the root `.env.schema`. Apps and packages import the items they use with `@import(../../, pick=[...])` in their own `.env.schema`, and local values live in the root `.env`. Development needs no `.env`: the schema provides local defaults that apply only when `APP_ENV=development`, and `pnpm deploy` runs with `APP_ENV=production`, so production values must be set explicitly. Varlock generates `src/env.ts` during installation; run `pnpm run env:generate` after changing a schema. Commit schemas, and keep secrets in ignored env files or your deployment platform.

Import the generated `ENV` accessor in application code. Shared database and auth packages receive configuration or initialized clients from the application. See [Varlock's monorepo guide](https://varlock.dev/guides/monorepos/).

For Cloudflare, Alchemy loads and validates deployment inputs with `varlock/auto-load` in its Node/Bun deployment process. Server code reads native bindings from `cloudflare:workers`. Alchemy supplies resource URLs and managed database credentials. In-Worker Varlock protections are deferred until an official Alchemy integration is available; see [the non-Wrangler deployment guidance](https://varlock.dev/integrations/cloudflare/#non-wrangler-deploy-tools-alchemy-sst-pulumi).

The framework integration or server bootstrap loads Varlock. Node deployments must include Varlock and its dependencies alongside the app schema.

Run standalone Node/Bun tools that use Varlock from the owning app directory so they load that app's schema and env files. `env:generate` only generates TypeScript files; it does not initialize environment values in a subsequent command.

## Deployment

### Alchemy

- Target: one TanStack Start Worker on Cloudflare
- Configure provider accounts: `cd packages/infra && pnpm exec alchemy profile edit`
- Dev: pnpm run dev
- Deploy: pnpm run deploy
- Destroy: pnpm run destroy

`alchemy profile edit` stores the selected Axiom, Cloudflare, Neon, PlanetScale, and/or Prisma provider profiles under `~/.alchemy`; no provider-specific setup command is required by this scaffold.

Deploys are staged and default to a personal `dev_<username>` stage. For production, run the deploy with an explicit stage from `packages/infra`:

```bash
cd packages/infra && pnpm exec alchemy deploy --stage production
```

## Git Hooks and Formatting

- Vite+ Git hooks install automatically on `pnpm install` (`prepare` runs `vp config`)
- Docs: [Vite+ commit hooks](https://viteplus.dev/guide/commit-hooks)
- Run checks: `pnpm run check`

## Project Structure

```
garage-comics/
├── apps/
│   └── web/         # TanStack Start app: pages, server functions, auth API
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── auth/        # Authentication configuration & logic
│   ├── db/          # Database schema & queries
│   └── infra/       # Alchemy stack (Worker, D1)
```

## Available Scripts

- `pnpm run dev`: Start the app locally through Alchemy
- `pnpm run build`: Build all applications
- `pnpm run db:generate`: Generate database client/types
- `pnpm run check`: Run Vite+ format, lint and type checks
- `pnpm run lint`: Run Vite+ lint checks
- `pnpm run format`: Run Vite+ formatting
- `pnpm run staged`: Run Vite+ checks against staged files
