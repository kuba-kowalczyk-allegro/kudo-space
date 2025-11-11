# API Endpoint Implementation Plan: List All Users

## 1. Endpoint Overview
- Implement `GET /api/users` to return user profiles for kudos recipient selection.
- Endpoint requires an authenticated session (validated via Astro middleware-injected Supabase client and user context).
- Supports optional case-insensitive search across display name and email and optionally excludes the current user (default behavior).
- Designed to leverage Supabase RLS (`profiles_select_all`) so any authenticated user can read all profiles.

## 2. Request Details
- **HTTP Method:** GET
- **URL Path:** `/api/users`
- **Authentication:** Required; reject requests without `locals.user` or missing Supabase client.
- **Query Parameters:**
	- `search` (optional string): Trimmed; empty string treated as no filter; limit length (e.g., ≤100 chars) to mitigate abuse; search is case-insensitive against `display_name` and `email`.
	- `exclude_me` (optional boolean): Defaults to `true`; accepts `true/false` (case-insensitive) and `1/0`; determines whether to exclude the authenticated user from results.
- **Request Body:** None.
- **Validation:** Use Zod schema with preprocessors for string-to-boolean coercion, trimming, and length enforcement; respond 400 on invalid query input per global error format.

## 3. Used Types
- `UserProfileDTO` and `UserListResponseDTO` from `src/types.ts` for shaping success payloads.
- `ErrorResponseDTO`, `ErrorCode`, and `ErrorDetails` from `src/types.ts` for standardized error responses.
- `SupabaseClient` type from `src/db/supabase.client.ts` for service function typing.
- Internal helper type `ListUsersQuery` (new) describing parsed query params: `{ requesterId: string; search?: string; excludeMe: boolean; }`.

## 4. Response Details
- **200 OK:** JSON body matching `UserListResponseDTO` with `data` array of `UserProfileDTO`. Results ordered alphabetically by `display_name`, fallback to `created_at` for deterministic ordering when names missing.
- **400 INVALID_PARAMETERS:** Returned when query validation fails; include Zod issue details keyed by parameter.
- **401 UNAUTHORIZED:** Returned when no authenticated user is present in request context.
- **500 INTERNAL_ERROR:** Returned for unexpected failures (e.g., Supabase errors, missing Supabase client).

## 5. Data Flow
1. Astro middleware injects Supabase client and authenticated user into `locals`.
2. API handler retrieves Supabase client and user from `locals`; returns 401 if user missing, 500 if client missing.
3. Parse query parameters with Zod schema to obtain `ListUsersQuery` (including `requesterId` derived from the authenticated user).
4. Call new `listUsers` service exported from `src/lib/services/profiles.service.ts`, passing Supabase client and parsed query.
5. Service builds Supabase query against `profiles`:
	 - Select `id`, `display_name`, `avatar_url`, `email`.
	 - Apply `.neq("id", requesterId)` when `excludeMe` is true.
	 - Apply case-insensitive filter via `.or()` combining `ilike("display_name", pattern)` and `ilike("email", pattern)` when `search` provided.
	 - Order results by `display_name` ascending, then `created_at` for stability.
6. Service maps Supabase rows directly to `UserProfileDTO[]` (field names align) and returns array.
7. Handler wraps array in `UserListResponseDTO` and returns JSON response with status 200.

## 6. Security Considerations
- Enforce authentication by verifying `locals.user`; rely on Supabase RLS to ensure only authenticated users access data.
- Limit selected columns to profile basics to avoid leaking sensitive information.
- Sanitize `search` via trimming and length enforcement; Supabase query builder parameterizes inputs to prevent injection.
- Default `exclude_me=true` to avoid exposing the caller redundantly; allow override for administrative use cases.
- Log unexpected errors with contextual metadata (e.g., user id, search term) using `console.error`, avoiding sensitive data exposure.

## 7. Error Handling
- Validation failures return 400 with `INVALID_PARAMETERS` and issue details.
- Missing authenticated user returns 401 `UNAUTHORIZED` with generic message.
- Missing Supabase client or Supabase SDK error returns 500 `INTERNAL_ERROR`; include console log for diagnostics.
- Gracefully handle empty result sets by returning `data: []` without error.

## 8. Performance Considerations
- Utilize existing `idx_profiles_display_name_lower` index by transforming search to lowercase comparisons via `ilike` (PostgreSQL handles via functional index).
- Avoid fetching unnecessary columns; rely on select list to minimize payload.
- Limit search length to guard against expensive wildcard scans; consider future pagination if user count grows.
- Order by `display_name` to provide deterministic UI behavior; index mitigates sort cost for large sets.

## 9. Implementation Steps
1. **Service Update:** Add `listUsers` function to `src/lib/services/profiles.service.ts` encapsulating Supabase query logic and returning `UserProfileDTO[]`.
2. **Schema Definition:** In `src/pages/api/users/index.ts`, create Zod schema handling `search` (trim & length limit) and `exclude_me` boolean coercion; define `ListUsersQuery` type.
3. **Handler Implementation:** Implement `GET` handler mirroring project conventions (error builder, auth checks, try/catch, service call, response formatting).
4. **Error Utilities:** Reuse or extract shared error response builder if desired (consider factoring from kudos route for consistency).
5. **Logging:** Add concise `console.error` statements for unexpected errors, including contextual info without exposing secrets.
6. **Documentation:** Ensure this plan and any future updates remain in `.ai/api/users-implementation-plan.md` for reference.
7. **Testing:** Manually verify endpoint via HTTP client (authenticated session) covering default, search filter, include-self path, and unauthorized request; add automated tests if harness exists.
