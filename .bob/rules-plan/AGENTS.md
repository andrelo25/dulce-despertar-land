# Project Architecture & Planning Rules (Non-Obvious Only)

- **Next.js 16 Partial Prerendering & Cache**: `cacheComponents: true` and `partialPrefetching: true` are enabled in `next.config.ts`. Any dynamic, un-cached data must be wrapped in a `<Suspense>` boundary.
- **Client/Server Isolation**: No Supabase client runs in the browser. Public reads execute via server-cached functions (`lib/catalog.ts`), and mutations execute via Server Actions.
- **Admin Defense-in-Depth**: Admin authentication relies strictly on JWT claims (`app_metadata.role = 'admin'`), enforced across edge/proxy checks, Data Access Layer (DAL), and PostgreSQL Row-Level Security.
- **Asynchronous WhatsApp Side Effects**: External WhatsApp notifications must execute asynchronously (via `after()` in Server Actions) and failure must never rollback or fail order creation.
