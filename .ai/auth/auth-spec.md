# KudoSpace Authentication Architecture Specification

## 1. Goals & Context

- Deliver login and logout with Supabase Auth using a single OAuth provider (Google by default, GitHub as a configurable alternative) to satisfy `.ai/prd.md` FR-001.
- Avoid email/password, registration forms, and password recovery to minimize implementation cost and security surface.
- Keep the kudos board (`src/pages/index.astro`) accessible solely to authenticated users without breaking existing SSR behaviour from `astro.config.mjs`.

## 2. User Interface Architecture

### 2.1 Global Layout & Routing

- `src/layouts/Layout.astro`
  - Add an auth-aware header slot receiving the authenticated user (`Astro.locals.session`) to render login or logout affordances.
  - Reserve `<slot name="auth-banner" />` for short-lived messages (e.g., "Google sign-in failed"), driven by query params or flash cookies.
- `src/middleware/index.ts`
  - Fetch the Supabase session once per request, attach `locals.session` and `locals.profile` (from the `profiles` view) for downstream usage.
  - Redirect unauthenticated users away from protected routes (`/`, `/api/kudos/*`, etc.) to `/login?redirectTo=...` while allowing `/login`, `/auth/*`, `/api/auth/*`.

### 2.2 Public Auth Page

- `src/pages/login.astro`
  - Server-rendered with the shared layout.
  - Renders `SocialLoginOptions.astro`, a presentational component showing exactly one sign-in button for the configured provider.
  - The button posts to `/api/auth/oauth-start` with the provider identifier embedded and optional `redirectTo` value (defaults to `/`).
  - Displays contextual alerts based on query params (`error`, `info`) produced by auth routes (e.g., user cancelled OAuth, provider unavailable).

### 2.3 Authenticated Experience

- `src/pages/index.astro`
  - Continues to rely on `locals.session`; middleware prevents anonymous access.
  - Receives `locals.profile` for personalized greetings or authorisation checks (e.g., showing delete buttons only for the author).
- `src/components/AppHeader.tsx`
  - Logged-in state: show user avatar/name and a logout button triggering `POST /api/auth/logout`.
  - Logged-out state: display a "Sign in" link to `/login` (mainly for preview environments without middleware).
- `src/components/Welcome.astro`
  - Optionally reused inside `/login` to reinforce value proposition while user is unauthenticated.

### 2.4 Client Components & Responsibilities

- `SocialLoginOptions.astro`
  - Pure Astro component; renders a single `<form method="post">` element for the active provider using a Shadcn button.
  - Includes hidden `redirectTo` field when present and a hidden `provider` input sourced from configuration.
- `LogoutButton.tsx`
  - React client component wired to call `/api/auth/logout` via `fetch` and redirect to `/login` on success.
- No client-side credential forms are required; all heavy lifting is delegated to Supabase OAuth.

### 2.5 Validation & Error Messaging

- Input validation limited to `provider` equalling the configured value and optional `redirectTo` path.
- Error display handled through:
  - Query-string driven `<Alert>` component on `/login` for provider errors or denied scopes.
  - Toast or inline banner on the board when session refresh fails (hooked into future enhancements).

### 2.6 Key Scenarios

- **First-time visitor**: redirected to `/login`, uses the configured provider (default Google), completes Supabase OAuth flow, returns to original page.
- **User cancels OAuth**: Supabase redirects back with `error=access_denied`; login page surfaces message and allows retry.
- **Provider outage**: `/api/auth/oauth-start` catches Supabase SDK errors, redirects back to `/login?error=provider_unavailable`.
- **Expired session**: middleware detects missing session, preserving intended destination via `redirectTo` when sending user to `/login`.

## 3. Backend Logic

### 3.1 API Route Structure (`src/pages/api/auth/*`)

- `oauth-start.ts` (POST)
  - Validates body with `OAuthStartSchema` (provider, redirectTo optional) and confirms provider matches configuration.
  - Calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: makeAbsoluteRedirect(redirectTo) } })`.
  - Responds with `303` redirect to Supabase authorization URL.
- `auth/callback.ts` (GET)
  - Handles Supabase redirects containing `code` and `state`.
  - Calls `supabase.auth.exchangeCodeForSession(code)` to set auth cookies.
  - Invokes `ensureProfile` (see §4.3) before redirecting to `redirectTo` (fallback `/`).
  - On failure, redirects to `/login?error=callback_failed`.
- `logout.ts` (POST)
  - Uses `supabase.auth.signOut();` clears cookies and redirects to `/login`.

### 3.2 Data Models & Types

- Extend `src/types.ts` with:
  - `type OAuthProvider = "google" | "github";` (used for compile-time safety while runtime configuration selects one value).
  - `type AuthRedirect = { redirectTo?: string }` for sharing redirect handling logic.
- Continue leveraging Supabase-generated types for `profiles`.

### 3.3 Validation Mechanism

- `src/lib/validation/auth.ts`
  - `OAuthStartSchema = z.object({ provider: z.enum(["google", "github"]), redirectTo: z.string().optional() });`
  - Helper `sanitizeRedirect(redirectTo)` ensuring same-origin relative paths; fallback to `/`.
  - `assertProviderAllowed(provider)` comparing against environment configuration (single value) and returning a typed error if mismatched.
- All API routes call `safeParse`; on failure respond with `303` redirect to `/login?error=invalid_request`.

### 3.4 Exception Handling & Logging

- Wrap Supabase SDK calls; map known errors to compact query-string codes (`provider_unavailable`, `callback_failed`).
- Log unexpected failures server-side with contextual metadata (request id, provider) to aid debugging without leaking to clients.

### 3.5 Server-Side Rendering Updates

- Astro already outputs server-rendered pages; new auth pages (`/login`, `/auth/callback`) remain SSR by default.
- Ensure new API routes export `export const prerender = false;` to avoid static generation.
- `src/pages/index.astro` continues to render on the server with guaranteed session data provided by middleware.

## 4. Authentication System Design

### 4.1 Supabase Integration Strategy

- Reuse `src/db/supabase.client.ts` helpers; expose `createSupabaseServerClient(Astro)` returning `{ supabase, session }` and automatically handling cookies.
- Middleware obtains session via `supabase.auth.getSession()` and places it on `locals` for all pages/API routes.

### 4.2 OAuth Flow

- User submits the single-provider form on `/login`.
- `/api/auth/oauth-start` redirects to Supabase-hosted consent screen.
- After consent, Supabase redirects to `/auth/callback` with exchange code.
- Callback exchanges code for a session, writes cookies, syncs profile, and redirects to final destination.

### 4.3 Profile Synchronisation

- Introduce `src/lib/services/profiles.service.ts` with `ensureProfile({ supabase, user })`.
- Called inside `auth/callback` and whenever middleware finds a session lacking a profile row.
- Populates the `profiles` table with the user's name, avatar URL, and email pulled from OAuth metadata, ensuring new users can create kudos immediately.

### 4.4 Logout Handling

- `LogoutButton.tsx` posts to `/api/auth/logout`; on success client navigates to `/login` and clears client-side state (if any caches exist later).
- Middleware guarantees logged-out users cannot access authenticated routes until a new session is established.

### 4.5 Access Control & Authorization

- Boards and API endpoints rely on `locals.session` and `locals.profile.id` to enforce ownership rules (e.g., deleting only self-authored kudos).
- Future admin-only features can consult `user.app_metadata` (e.g., roles) supplied via Supabase, without revisiting login flows.

## 5. Security & Compliance Considerations

- Validate and sanitize `redirectTo` to prevent open redirects; allow only same-origin paths.
- CSRF exposure is minimal because auth forms post to same-origin endpoints; still include a `csrfToken` hidden input generated by middleware to align with existing standards.
- Ensure `SITE_URL` in Supabase settings matches deployment origins so OAuth callbacks function correctly.
- Provide descriptive but non-sensitive error copy (e.g., "Sign-in with Google failed. Try again." or provider-specific equivalent).

## 6. Testing Strategy (High-Level)

- Manual sign-in verification against the configured Supabase provider (Google by default; run GitHub checks only if configured).

## 7. Deployment & Configuration Notes

- Document required environment variables:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only).
  - `SITE_URL` (production + preview) used for redirect construction.
  - `SUPABASE_OAUTH_PROVIDER="google"` (or `"github"`) to drive UI and validation.
- Supabase dashboard configuration:
  - Enable the chosen provider (Google or GitHub) and set callback URL to `${SITE_URL}/auth/callback`.
  - Disable password sign-ups to enforce OAuth-only access.
