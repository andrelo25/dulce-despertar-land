# AGENTS.md

This file provides guidance to agents when working with code in this repository.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands
- **Dev server**: `npm run dev`
- **Run all tests**: `npm test` (runs `vitest run`)
- **Run single test file**: `npx vitest run <file>` (e.g. `npx vitest run lib/domain/money.test.ts`)
- **Run single test by name**: `npx vitest run -t "<name>"`
- **Lint**: `npm run lint`
- **Build**: `npm run build`

## Architecture & Code Conventions
- **Project Structure**: Root-level `app/`, `components/`, `lib/`, `supabase/`, `specs/`. Path alias `@/*` resolves to `./*` (no `src/` directory).
- **Domain Layer (`lib/domain/`)**: Pure TypeScript business logic without network/framework dependencies. Unit-tested in `*.test.ts` next to the implementation.
- **Supabase Clients**:
  - `lib/supabase/publishable.ts`: `createPublishableClient()` (unauthenticated, safe for `use cache`).
  - `lib/supabase/secret.ts`: `createSecretClient()` (`server-only`, bypasses RLS for `create_order` and background actions).
  - `lib/supabase/server.ts`: `createClient()` (cookie-based session via `@supabase/ssr` for admin panel).
- **Database Testing**: `supabase/tests/schema.test.ts` tests SQL migrations & seed idempotence locally using `@electric-sql/pglite` (no running Supabase instance needed).
- **Domain Gotchas**:
  - Timezone is fixed Argentina UTC-3 (`TZ_OFFSET = "-03:00"`). Delivery slots require $\ge 12$ hours lead time (`MIN_LEAD_HOURS = 12`).
  - Personalization messages (max 150 chars) only apply to `desayunos` and `tortas`; `dulces` never accept custom messages.
  - Phones are 10-digit Argentina format without `0` or `15` (e.g. `3513445566`). WhatsApp IDs prefix with `549`.
  - Admin authorization MUST check `app_metadata.role === 'admin'` (never `user_metadata.role`).
