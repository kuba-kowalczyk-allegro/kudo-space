# API Endpoint Implementation Plan: Create Kudo

## 1. Endpoint Overview
Creates a new kudo record for another user. Automatically assigns the authenticated user as the sender and returns the full `KudoDTO`, including populated sender and recipient profiles, for immediate UI consumption.

## 2. Request Details
- HTTP Method: POST
- URL Structure: `/api/kudos`
- Parameters:
  - Required: none
  - Optional: none
- Request Body (JSON):
  - `recipient_id` (string, UUID format)
  - `message` (string, trimmed, 1-1000 characters)

## 3. Used Types
- `CreateKudoCommand` (request payload shape) from `src/types.ts`
- `KudoDTO` (success payload) from `src/types.ts`
- `ErrorResponseDTO`, `ErrorCode` for standardized error handling
- `SupabaseClient` from `src/db/supabase.client.ts`
- `ProfileEntity` (optional recipient existence check) from `src/types.ts`

## 4. Response Details
- 201 Created with `KudoDTO` body on success
- 400 Bad Request for validation failures (`INVALID_RECIPIENT`, `SELF_KUDO_NOT_ALLOWED`, `INVALID_MESSAGE`, `MESSAGE_TOO_SHORT`, `MESSAGE_TOO_LONG`)
- 401 Unauthorized when `locals.user` missing
- 500 Internal Error for unexpected failures (e.g., Supabase client missing, database error)

## 5. Data Flow
1. Astro middleware supplies `locals.supabase` and `locals.user`.
2. Handler guards for missing supabase client (500) or unauthenticated user (401).
3. Parse and validate JSON body with Zod schema:
   - Coerce/trim message, enforce length limits.
   - Validate `recipient_id` as UUID.
4. Enforce recipient != sender early; return `SELF_KUDO_NOT_ALLOWED` if violated.
5. Call new `createKudo` service:
   - Verify recipient existence via `profiles` select to convert not-found into `INVALID_RECIPIENT` (status 400).
   - Insert into `kudos` table with `sender_id` from authenticated user, letting RLS ensure ownership.
   - Select the inserted row (via `kudos_with_users` view) to build `KudoDTO`.
6. Return `KudoDTO` with 201 status.
7. Log unexpected errors with minimal context (`console.error` incl. senderId, recipientId).

## 6. Security Considerations
- Require authenticated user (`locals.user`) for all operations.
- Use Supabase client from `locals` to ensure RLS enforcement (`kudos_insert_own`).
- Validate recipient against `profiles` to avoid leaking existence via errors.
- Guard against self-sends despite DB constraint for clearer error semantics.
- Trim message to mitigate whitespace abuse; rely on prepared statements via Supabase for injection safety.

## 7. Error Handling
- Validation (Zod) issues -> map to 400 with `INVALID_MESSAGE`/`MESSAGE_TOO_SHORT`/`MESSAGE_TOO_LONG` or generic `INVALID_RECIPIENT` for recipient problems.
- Recipient missing -> 400 with `INVALID_RECIPIENT`.
- Self-kudo attempt -> 400 with `SELF_KUDO_NOT_ALLOWED`.
- Supabase insert errors (FK violation, RLS) -> catch and translate when possible; otherwise 500.
- Missing Supabase client -> 500 `INTERNAL_ERROR`.
- Unexpected errors -> log and return 500 `INTERNAL_ERROR`.

## 8. Performance Considerations
- Single insert + select; ensure select uses `kudos_with_users` view which already bundles sender/recipient details.
- Optional recipient existence check should leverage indexed `profiles.id` (primary key); minimal overhead.
- Avoid redundant data fetching by reusing the view query after insert.

## 9. Implementation Steps
1. Extend `src/lib/services/kudos.service.ts` with `createKudo(client, { senderId, recipientId, message })` that:
   - Verifies recipient exists (fetch from `profiles`).
   - Performs insert into `kudos` with required columns.
   - Retrieves inserted kudo from `kudos_with_users` view and maps to `KudoDTO` (reuse/mimic existing mapping utilities).
2. Refactor mapping utilities if needed so both list and create paths share logic (e.g., export `mapRowToDto`).
3. In `src/pages/api/kudos/index.ts`, add a `POST` handler:
   - Reuse existing `buildErrorResponse` helper.
   - Extract request body via `await request.json()` and validate with Zod schema.
   - Enforce `recipient_id !== user.id` prior to service invocation.
   - Call `createKudo` and return 201 with JSON payload.
4. Add targeted logging (`console.error`) in catch blocks with contextual identifiers.
5. Update or add API manual test scripts covering success, invalid recipient, self-kudo, short/long message, and unauthenticated flows.
6. Document new service function usage if needed in `.ai` plans, ensuring future maintainers understand dependency on RLS.
