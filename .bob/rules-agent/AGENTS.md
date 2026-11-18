# Agent Coding Rules (Non-Obvious Only)

- **Pure Domain Isolation**: Logic in `lib/domain/` is pure, framework-agnostic TypeScript. Always place corresponding unit tests directly alongside as `*.test.ts`.
- **`use cache` Client Restriction**: Never pass cookie-dependent clients to functions tagged with `"use cache"`. Use `createPublishableClient()` (`lib/supabase/publishable.ts`) for cached public catalog queries.
- **Server Action Mutations**: Order submissions must invoke SQL RPC `create_order` using `createSecretClient()` (`lib/supabase/secret.ts`). Never trust client-submitted prices or totals.
- **Cart Hydration Pattern**: Always hydrate cart state from `localStorage` (`STORAGE_KEY = "buen-dia:cart:v1"`) inside `useEffect` after mount to prevent SSR hydration mismatches. Conciliate active items using `dropInactive()`.
- **Zod 4 Validation**: Project uses Zod 4 syntax (`{ error: "..." }` config objects and `ctx.addIssue({ code: "custom", ... })`). Optional unknown fields (like honeypots) must explicitly declare `.optional()`.
- **Database Test Mocking**: Add schema or RPC integration tests directly to `supabase/tests/schema.test.ts` via PGlite instead of mocking Supabase API calls.
