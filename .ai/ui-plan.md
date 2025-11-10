# UI Architecture for KudoSpace

## 1. UI Structure Overview

KudoSpace delivers a hybrid Astro + React experience with a single primary application shell (Layout.astro) that renders server-side content and hydrates interactive widgets on-demand. Authenticated users land on the Kudos Board page, featuring a sticky global header, infinite-scroll kudos grid, and modal-driven workflows for creating and deleting kudos. Public users view an authentication gateway that drives Supabase social login. All flows reuse shared components for feedback (toasts, skeletons, empty states) and respect accessibility guardrails (focus management, keyboard traps). Global context (AuthContext) synchronizes user identity across header controls, security-bound actions, and API integrations.

## 2. View List

- **Authentication Gateway**
	- View path: `/login`
	- Purpose: Introduce product, surface Supabase-powered social login, and handle auth errors.
	- Key information: Product value statement, login button, error messaging.
	- Key view components: Hero section, `LoginButton`, `AuthErrorBanner`.
	- UX/Accessibility/Security: Large-tap login button, focus ring; guard against repeated submissions; redirect authenticated visitors to `/`.

- **Kudos Board**
	- View path: `/`
	- Purpose: Authenticated hub to browse and manage kudos.
	- Key information: Grid of kudos ordered newest-first, manual refresh, infinite-scroll loader, empty-state messaging.
	- Key view components: `AppHeader`, `KudoGrid`, `KudoCard`, `KudoSkeleton`, `EmptyState`, `ManualRefreshButton`.
	- UX/Accessibility/Security: Sticky header maintains navigation; cards expose semantic regions; delete controls hidden unless sender matches viewer;

- **Create Kudo Modal**
	- View path: Overlay spawned from `/` (shadcn/ui Dialog).
	- Purpose: Collect recipient and message, optionally seed AI-generated text, submit new kudo.
	- Key information: Recipient combobox (excluding self), message textarea with counter, AI prompt flow, validation errors, submission state.
	- Key view components: `Dialog`, `RecipientCombobox`, `MessageTextarea`, `CharacterCounter`, `AiPromptToggle`, `FormErrorList`, `PrimaryButton`.
	- UX/Accessibility/Security: Focus trap with initial focus on recipient; ESC / close button support; AI request disabled until prompt valid; server errors surface via toast; submit button disabled while posting to avoid duplicates.

- **Delete Confirmation Dialog**
	- View path: AlertDialog overlay from `/` triggered per `KudoCard`.
	- Purpose: Confirm destructive action before removing user-authored kudo.
	- Key information: Kudo preview (sender → recipient), confirmation text, destructive action buttons.
	- Key view components: `AlertDialog`, `KudoSummary`, `DestructiveButton`, `CancelButton`.
	- UX/Accessibility/Security: Default focus on Cancel; optimistic removal paired with rollback on API failure; accessible description clarifies irreversibility; requires sender ownership check before opening.

- **Session Timeout View**
	- View path: `/session-expired`
	- Purpose: Catch 401 responses and prompt re-authentication while preserving return path.
	- Key information: Message explaining expiration, `ReauthenticateButton`, optional troubleshooting tips.
	- Key view components: `NoticePanel`, `ReauthenticateButton`.
	- UX/Accessibility/Security: Auto-focus on call-to-action, ensures logout state cleared before redirect to login.

- **Global Error View**
	- View path: `/error`
	- Purpose: Present recoverable full-screen error when board fails to load (e.g., 500, network outage).
	- Key information: Friendly error copy, retry action, support contact link.
	- Key view components: `ErrorState`, `RetryButton`.
	- UX/Accessibility/Security: retry replays last request; ensures no sensitive data leaks in copy; fallback accessible from keyboard.

## 3. User Journey Map

- **First-time login (US-001)**
	1. User lands on `/login` (Authentication Gateway).
	2. Clicks `LoginButton`, authenticates via Supabase social provider.
	3. Redirect back to `/` with session cookie; AuthContext hydrates user via `/api/users/me`.
	4. If no kudos exist, `EmptyState` encourages “Give First Kudo”.
	5. User triggers Create Kudo Modal to post first message.

- **Browse kudos (US-002)**
	1. Authenticated user sees `KudoGrid` ordered newest-first.
	2. Infinite scroll requests `/api/kudos` with offset on intersection.
	3. Manual refresh button invalidates cache; skeleton row shows loading.

- **Create kudo manually (US-003)**
	1. Select “Give Kudos” in header → Create Kudo Modal opens.
	2. Choose recipient via combobox (fetch from `/api/users?exclude_me=true`).
	3. Compose message; submit posts `/api/kudos`.
	4. Modal closes on success; board refetches first page and prepends new kudo.

- **Create kudo with AI (US-005)**
	1. Inside modal, user activates “✨ Generate with AI”.
	2. Prompt field appears; valid prompt triggers POST `/api/ai/generate-message`.
	3. Loading spinner displayed; success writes generated text into message field.
	4. User edits if needed, then submits kudo as above.

- **Handle AI failure (US-006)**
	1. If AI request returns error/timeout, toast notifies user.
	2. Prompt field remains editable; user manually types message and submits.

- **Delete kudo (US-004)**
	1. User locates own kudo (delete icon visible).
	2. Click opens Delete Confirmation Dialog; optimistic removal triggers immediately.
	3. `/api/kudos/{id}` DELETE sent; toast confirms success or surfaces rollback on error.

- **Session expiration (US-001, US-007)**
	1. API returns 401; AuthContext clears session.
	2. User redirected to `/session-expired` with return URL.
	3. Re-authentication button routes to `/login`; upon success, user returned to saved path.

## 4. Layout and Navigation Structure

- **Global Layout**: `Layout.astro` wraps all views, injecting metadata, global styles, Tailwind classes, and mounts `AuthProvider` plus toast portal.
- **Header (authenticated)**: Sticky across `/`; contains logo link to `/`, “Give Kudos” button (opens modal), manual refresh (if needed), user avatar menu (dropdown with display name, email, logout per `/api/users/me`).
- **Header (unauthenticated)**: Simplified variant on `/login` showing logo and “Back to login” link.
- **Primary Navigation**: Minimal; root board is main destination. Additional top-level links (privacy/help) appear in footer.
- **Routing Guards**: Middleware redirects unauthenticated users hitting `/` to `/login`; conversely, authenticated hits to `/login` bounce to `/`.
- **Transitions**: Astro View Transitions provide smooth route changes between main views.

## 5. Key Components

- `AppHeader`: Responsive navigation bar managing CTA visibility, user menu, and refresh control.
- `AuthContext` (logic + consumer hook): Supplies auth state to header, modals, and guards.
- `KudoGrid` / `KudoCard`: Grid layout with responsive columns, card-level metadata (avatars, names, timestamps, delete control).
- `InfiniteScrollObserver`: Intersection Observer wrapper that requests additional kudos batches from `/api/kudos`.
- `CreateKudoForm`: React form using react-hook-form + zod, including recipient combobox, message textarea, AI prompt workflow.
- `RecipientCombobox`: shadcn/ui Combobox integrated with `/api/users` results, client-side filter fallback.
- `AiPromptSection`: Handles prompt input, loading, error states, and populates message field.
- `ToastProvider` + `Toast`: Centralized notifications for success/error (AI failures, delete undo).
- `SkeletonList`: Skeleton card placeholders for initial load and pagination fetches.
- `EmptyState`: Encourages first kudo with call-to-action hooking into Create Modal.
- `ManualRefreshButton`: Re-fetches first page when stale; accessible tooltip explains behavior.
- `LogoutButton`: Calls Supabase sign-out, clears context, redirects to `/login`.
- `ErrorState` & `NoticePanel`: Reusable panels for error and session-expired views, ensuring consistent messaging and accessibility semantics.
