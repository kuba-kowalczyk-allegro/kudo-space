# API Endpoint Implementation Plan: Delete Kudo

## 1. Endpoint Overview

Deletes an existing kudo by ID. Only the original sender is authorized to remove it. Returns a confirmation payload to support UI updates.

## 2. Request Details

- HTTP Method: DELETE
- URL Structure: `/api/kudos/{id}`
- Parameters:
  - Required Path: `id` (string, UUID format)
  - Query: none
- Request Body: none

## 3. Used Types

- `DeleteKudoResponseDTO` (success payload) from `src/types.ts`
- `ErrorResponseDTO`, `ErrorCode` for error handling
- `SupabaseClient` from `src/db/supabase.client.ts`
- (Optional) `KudoDTO` if service reuses mapping when verifying ownership

## 4. Response Details

- 200 OK with `{ message: string; id: string }`
- 400 Bad Request for invalid UUID (`INVALID_UUID`)
- 401 Unauthorized when `locals.user` missing
- 403 Forbidden when authenticated user is not the sender
- 404 Not Found when kudo does not exist
- 500 Internal Error for unexpected failures or missing Supabase client

## 5. Data Flow

1. Middleware supplies `locals.supabase` and `locals.user`.
2. Handler verifies both; respond with 500 or 401 as appropriate.
3. Validate `id` path parameter with Zod UUID schema.
4. Invoke new `deleteKudo` service:
   - Fetch kudo by ID (either via `kudos` table or `kudos_with_users` view) to confirm existence and retrieve `sender_id`.
   - Compare `sender_id` with `locals.user.id`; return `FORBIDDEN` if mismatch.
   - Delete kudo using Supabase query builder (`.delete().eq("id", id)`) relying on RLS; include guard to ensure a row was deleted.
5. Return confirmation payload with 200 status.
6. Log unexpected errors with contextual metadata (`console.error` including kudo id and user id).

## 6. Security Considerations

- Require authenticated user.
- Perform server-side ownership check before executing delete, even though RLS enforces it, to surface appropriate `FORBIDDEN` error instead of generic failure.
- Use Supabase client from locals to ensure RLS policies apply (`kudos_delete_own`).
- Reject malformed UUIDs before hitting the database to reduce attack surface.

## 7. Error Handling

- Invalid UUID parsing -> 400 `INVALID_UUID`.
- Missing Supabase client -> 500 `INTERNAL_ERROR`.
- Missing authenticated user -> 401 `UNAUTHORIZED`.
- Kudo not found -> 404 `KUDO_NOT_FOUND` (when initial fetch returns null or delete affects 0 rows).
- Unauthorized delete attempt -> 403 `FORBIDDEN`.
- Supabase errors -> log and return 500 `INTERNAL_ERROR` with generic message.

## 8. Performance Considerations

- Single fetch + delete; both index-supported via primary key.
- Reuse existing mapping logic if we fetch from `kudos_with_users` to avoid redundant transformations.
- Avoid multiple round-trips by using `select().single()` prior to delete; ensures minimal payload size.

## 9. Implementation Steps

1. Extend `src/lib/services/kudos.service.ts` with helper(s):
   - `getKudoById(client, id)` to retrieve minimal data (`id`, `sender_id`) and optionally reuse mapping utility if needed.
   - `deleteKudo(client, { id, requesterId })` to encapsulate fetch-then-delete logic and return `{ id }`.
2. Create new route file `src/pages/api/kudos/[id].ts` exporting `DELETE` handler (`export const prerender = false`):
   - Validate path param with Zod.
   - Perform authentication and Supabase client checks.
   - Use service to attempt deletion and translate service-level errors to HTTP responses.
3. Reuse or extract `buildErrorResponse` helper (shared with list/create handler) for consistency.
4. Add structured `console.error` logging when unexpected errors occur, including `id` and `requesterId` context.
5. Update tests or manual verification scripts to cover: successful delete, invalid UUID, not-found, forbidden (other user), and unauthenticated access.
