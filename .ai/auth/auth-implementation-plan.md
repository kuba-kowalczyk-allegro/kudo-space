# Auth implementation plan

Comprehensive outline for wiring the existing Astro+Supabase login UI to the backend, aligning with the PRD, auth spec, and current codebase state.

## Discussion

1. **Q:** Which OAuth provider(s) should be enabled? **A:** GitHub only (via `SUPABASE_OAUTH_PROVIDER=github`).
2. **Q:** Are Supabase project credentials already available to Astro? **A:** Yes, values live in the existing `.env` file.
3. **Q:** How should unauthenticated API calls behave? **A:** Redirect to `/login`, preserving SSR expectations.
4. **Q:** Is `/auth/callback` already registered in Supabase? **A:** Not yet; must be added to the Supabase dashboard `SITE_URL` settings.
5. **Q:** Do helper/services for profile sync already exist? **A:** No; they need to be implemented (e.g., `ensureProfile`).
6. **Q:** Should middleware preserve the requested path when redirecting? **A:** Yes; append `redirectTo` when sending users to `/login` and skip auth-free routes.
7. **Q:** Do we need flash messaging beyond query params? **A:** User unsure; recommendation: stick with query-string driven banners for MVP simplicity.
8. **Q:** Should `/api/auth/oauth-start` include CSRF/nonce handling? **A:** User unsure; recommendation: rely on same-origin POST without extra tokens for MVP, revisit if threat model grows.
9. **Q:** What profile fields must be populated? **A:** Match `public.profiles` expectations—`display_name`, `avatar_url`, `email` from OAuth metadata; avoid overwriting existing data unintentionally.
10. **Q:** Should we add logging/telemetry on callback failures? **A:** No; surface user-friendly errors like `callback_failed` without internal details.

## Implementation steps

1. **Supabase configuration:** Register `https://<site>/auth/callback` (and local dev URL) in Supabase OAuth redirect URLs; confirm GitHub provider is enabled.
2. **Environment audit:** Ensure `.env` exposes `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_OAUTH_PROVIDER`, and `SITE_URL`; document required values if missing.
3. **Server client utilities:** Review `src/db/supabase.client.ts`; extend/export helpers to create server clients and return `{ supabase, session }` for both pages and API routes.
4. **Middleware guard (`src/middleware/index.ts`):**
   - Instantiate the Supabase server client per request, fetch session/profile.
   - Attach `locals.session` and `locals.profile` (pulling from `profiles` view, calling `ensureProfile` fallback if necessary).
   - Redirect unauthenticated traffic to `/login?redirectTo=<encoded path>` except for auth-exempt routes (`/login`, `/auth/callback`, `/api/auth/*`, static assets, etc.).
5. **Validation module (`src/lib/validation/auth.ts`):** Create Zod schemas (`OAuthStartSchema`, `sanitizeRedirect`, `assertProviderAllowed`) enforcing provider and redirect rules.
6. **Profile service (`src/lib/services/profiles.service.ts`):** Implement `ensureProfile({ supabase, user })` to upsert missing rows using OAuth metadata without clobbering existing records.
7. **Auth API routes (under `src/pages/api/auth/`, all `prerender = false`):**
   - `oauth-start.ts` (POST): Validate body, ensure provider matches env, call `supabase.auth.signInWithOAuth` with absolute redirect, respond with 303.
   - `callback.ts` (GET): Exchange code for session, invoke `ensureProfile`, redirect to sanitized `redirectTo` or `/` with relevant error query on failure.
   - `logout.ts` (POST): Call `supabase.auth.signOut`, clear cookies, redirect to `/login?info=logged_out`.
8. **Auth callback page:** If required by Astro routing, add minimal handler/page at `src/pages/auth/callback.ts` delegating to API logic or performing redirect.
9. **Layout wiring (`src/layouts/Layout.astro` & header components):**
   - Accept `session`/`profile` via slots or props; render login/logout actions per spec.
   - Ensure `AppHeader.tsx` and `LogoutButton.tsx` align with new endpoints (`/api/auth/logout`).
10. **Login page (`src/pages/login.astro`):** Confirm it consumes `error`/`info` query params, passes `redirectTo`, and submits to `/api/auth/oauth-start` with provider hidden input.
11. **Kudos board integration:** Update `src/pages/index.astro` (and related components) to rely on `locals.session/profile` for greetings and ownership checks.
12. **Testing & QA:**
    - Local flow: visit `/`, verify redirect to `/login`, initiate GitHub OAuth, complete callback, confirm profile auto-created, redirect to original path.
    - Verify logout redirects and clears access.
    - Confirm unauthenticated API access redirects to `/login` with preserved `redirectTo`.
    - Exercise error paths (`error=access_denied`, missing provider) and ensure banners display correctly.
13. **Documentation:** Record setup steps in README or project docs (environment vars, Supabase configuration, dev login instructions).
