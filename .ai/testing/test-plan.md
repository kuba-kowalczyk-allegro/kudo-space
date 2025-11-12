# KudoSpace Test Plan

## 1. Introduction and Testing Objectives
- Ensure the KudoSpace MVP meets quality expectations across authentication, kudos board, create/delete flows, and the optional AI integration.
- Primary objectives: confirm alignment with PRD requirements (FR-001–FR-010), validate stability under multi-user usage, protect data security, and guarantee resilience of external services (Supabase, OpenRouter).
- Plan scope covers both the frontend layer (Astro + React + Tailwind) and backend services (Astro API routes, Supabase, OpenRouter service).

## 2. Test Scope
- User personas: unauthenticated visitor, authenticated user without kudos, active sender, recipient.
- Functional flows: login/logout, kudos board retrieval, pagination, creating kudos, deleting own kudos, AI message generation, recipient filtering, error messaging.
- Integrations: Supabase (auth, RLS on `kudos`, `profiles`, `kudos_with_users` view), OpenRouter AI endpoint, Astro middleware.
- Out of scope: features not defined in the PRD (e.g., editing, multiple boards), CI/CD pipelines, infrastructure beyond test-environment configuration.

## 3. Test Types
- Unit tests: `kudos.service`, `profiles.service`, `openrouter.service`, Zod validation helpers, hooks (`useInfiniteKudos`, `useCreateKudoMutation`).
- Integration tests: API routes (`/api/kudos`, `/api/kudos/{id}`, `/api/users`, `/api/ai/generate-message`, `/api/auth/oauth-start`), auth middleware, Supabase connectivity (using a test database or Supabase CLI).
- End-to-end (E2E) tests: browser scenarios (Playwright) covering login, kudos create/delete, infinite scroll, AI generation, error handling.
- Security tests: RLS bypass attempts (deleting others’ kudos), unauthenticated access, XSS vectors via form inputs, OAuth redirect validation.
- Performance and resilience tests: simulate OpenRouter failures (timeout, rate limit) and Supabase outages (missing client in `locals`).

## 4. Test Scenarios for Key Features
1. **Authentication**
   - Load `/login` without a session, verify GitHub option is visible.
   - Successful OAuth flow (mock Supabase) returning to the main board.
   - Display `error=*` and `info=*` codes on the login page.
   - Attempt to access `/` without a session → redirect to login with `redirectTo` preserved.
2. **Kudos Board View (`KudosBoard`)**
   - Initial load (`useInfiniteKudos`): skeleton state, descending order by `created_at`.
   - API failure handling (mock 500): error banner with code and message.
   - Infinite scroll: fetch additional pages, no duplicates.
   - Manual refresh (ManualRefreshButton) maintaining scroll anchor where applicable.
3. **Create Kudos (`CreateKudoForm`)**
   - Form validation: missing recipient, message <1 character, >1000 characters, `recipient_id` equals `sender_id` (expect `SELF_KUDO_NOT_ALLOWED`).
   - Happy path: select recipient, enter message, success toast, form reset, new kudo appears at top of board.
   - Server errors: simulate `INVALID_RECIPIENT`, `FORBIDDEN`, `INTERNAL_ERROR` → `FormErrorList` renders, error toasts displayed.
   - Recipient fetch (`useRecipientOptions`): behavior when `/api/users` fails, retry interaction.
4. **Delete Kudos**
   - Delete button visibility limited to sender (`canDelete`).
   - Confirmation dialog (`AlertDialog`): cancel vs confirm paths.
   - Successful DELETE: success toast, board refresh removes item.
   - Negative paths: delete someone else’s kudo (`FORBIDDEN`), unauthenticated request (`401`), missing kudo (`404`).
5. **AI Prompt Section / `/api/ai/generate-message`**
   - Prompt length validation (below 10, above 200, whitespace only).
   - Successful generation: content injected into Message field, AI section collapses.
   - Error codes handled in UI (`PROMPT_TOO_SHORT`, `AI_SERVICE_UNAVAILABLE`, `INVALID_PROMPT`, etc.).
   - Simulate OpenRouter misconfiguration (missing key, 401) and ensure graceful fallback.
6. **API `/api/users`**
   - Parameters `exclude_me`, `search` (combinations, length enforcement).
   - Ensure `401` for unauthenticated access, `400` for invalid parameters.
7. **Middleware and Navigation**
   - Public routes (`/login`, `/api/auth/oauth-start`) accessible without session.
   - Static assets `_astro/*` delivered without auth checks.
   - Redirect to login when session expires.
8. **Migrations and RLS**
   - Run migrations on test database.
   - Verify policies: user without proper role cannot insert/delete; only authors receive `canDelete` true.

## 5. Test Environment
- **Local (dev):** Astro dev server (`npm run dev`), local Supabase (Supabase CLI `supabase start`), `.env.local` with test OpenRouter key.
- **Test/Staging:** Docker deployment on DigitalOcean with separate Supabase project, GitHub test account, OpenRouter key with restricted quota.
- **Database:** Dedicated instances with migrations (`supabase/migrations`), seed data from `supabase/seed.sql` for test users and sample kudos.
- **Data control:** reset database before integration/E2E runs (Supabase CLI scripts or transactional migrations).

## 6. Testing Tools
- **Unit/Integration:** Vitest + React Testing Library, MSW for fetch mocking, Supabase test harness/`@supabase/supabase-js` stubs.
- **E2E:** Playwright (headless + trace viewer), optional GitHub Actions integration.
- **API/Contract:** Newman/Postman collections or Pact tests for `/api/kudos`, `/api/ai` with OpenRouter mocks.
- **Quality monitoring:** ESLint, TypeScript, Jest coverage reporting in CI.
- **Accessibility/UX:** axe-core for component audits, Lighthouse.
- **Performance:** k6 or Artillery for lightweight API load tests, Playwright traces for render timings.
