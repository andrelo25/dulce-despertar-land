# Project Context & Documentation Rules (Non-Obvious Only)

- **Root Structure**: The repository does not have a `src/` directory. Core code is organized directly under `app/`, `components/`, `lib/`, and `supabase/`.
- **Project Specifications**: Authoritative business requirements and architecture plans reside in `specs/tienda-buen-dia/spec.md`, `specs/tienda-buen-dia/plan.md`, and `specs/tienda-buen-dia/tasks.md`.
- **Visual Design Reference**: Static reference design and markup reside in `resources/index/index.html`.
- **Database Schema & Migrations**: Migrations in `supabase/migrations/` and `supabase/seed.sql` are verified locally using `@electric-sql/pglite` in `supabase/tests/schema.test.ts`.
