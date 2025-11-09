# API Endpoint Implementation Plan: List All Kudos

## 1. Endpoint Overview

- Expose `GET /api/kudos` to return a paginated, reverse-chronological list of kudos with sender and recipient metadata.
- Intended for authenticated users to browse the kudos board; no role-based filtering beyond Supabase RLS policies.
- Built as an Astro API route leveraging Supabase views for denormalized data access.

## 2. Request Details

- HTTP Method: `GET`
- URL Structure: `/api/kudos`
- Authentication: Required via middleware-populated `context.locals.user`
- Parameters:
  - Required: none
  - Optional (query string):
    - `limit`: integer, defaults to 50, must be 1-100.
    - `offset`: integer, defaults to 0, must be ≥ 0.
- Request Body: none
- Validation: Use zod schema to enforce numeric bounds and coerce string query params to numbers; respond with 400 on failure.

## 3. Used Types

- Reuse shared DTOs from `src/types.ts`: `KudoDTO`, `KudoListResponseDTO`, `PaginationDTO`.
- Introduce internal helper type (if useful) for validated query params, e.g., `ListKudosQuery = { limit: number; offset: number; }`, scoped to the service.

## 4. Response Details

- Success (200): JSON payload matching `KudoListResponseDTO` containing `data` array of `KudoDTO` objects and pagination metadata.
- Error Responses:
  - 400 with `ErrorResponseDTO` (`INVALID_PARAMETERS`).
  - 401 with `ErrorResponseDTO` (`UNAUTHORIZED`) when middleware/user context missing.
  - 500 with `ErrorResponseDTO` (`INTERNAL_ERROR`) for unexpected failures.
- Ensure timestamps are serialized as ISO strings (Supabase returns strings by default).

## 5. Data Flow

1. Astro middleware authenticates request, injects Supabase client + user into `context.locals`.
2. API handler parses query parameters and validates via zod schema.
3. Delegate business logic to a new service in `src/lib/services/kudos.service.ts` (or extend existing module):
   - Accept Supabase client + `{ limit, offset }`.
   - Query `kudos_with_users` view with `.select('*')`, `.order('created_at', { ascending: false })`, `.range(offset, offset + limit - 1)`.
   - Issue a second query (or leverage `.select('*', { count: 'exact', head: true })`) to obtain total count for pagination; prefer single request using `maybeSingle` count options to minimize round-trips.
4. Map Supabase rows to `KudoDTO` shape, ensuring nested `sender`/`recipient` fields are constructed from view columns.
5. Return assembled `KudoListResponseDTO` to handler, which serializes JSON with status 200.

## 6. Security Considerations

- Rely on Supabase-authenticated session; check `context.locals.user` and short-circuit 401 if absent.
- Supabase RLS on `kudos_with_users` should permit authenticated read; confirm policies allow board-wide read for all users.
- Prevent injection/abuse by coercing and clamping numeric query params; reject large offsets/limits beyond 100.
- Avoid leaking internal errors—return generic 500 message while logging detailed error server-side.

## 7. Error Handling

- Validation errors: catch zod issues, respond 400 `INVALID_PARAMETERS` with detail keys for `limit`/`offset`.
- Missing auth context: respond 401 `UNAUTHORIZED`.
- Supabase errors (network, policy failures, etc.): log with context (query args, user id) and respond 500 `INTERNAL_ERROR`.

## 8. Performance Considerations

- Use Supabase `range` pagination rather than fetching all rows.
- Ensure query orders by indexed column (`created_at`); add index in migration if not yet present.
- Limit to max 100 rows to cap payload size; consider future cursor-based pagination if board grows.
- Minimize round-trips by leveraging Supabase `count: 'exact'` within same call when feasible.

## 9. Implementation Steps

1. Create `src/lib/services/kudos.service.ts` with a `listKudos` function (supabase client + pagination params) returning `KudoListResponseDTO` components.
2. Define zod schema in the API route file (e.g., `src/pages/api/kudos/index.ts`) to parse/validate `limit`/`offset`, using `.default` and `.transform` for coercion.
3. Implement Astro API handler:
   - Check `context.locals.user`; return 401 if absent.
   - Validate query params; on failure, return 400 via `ErrorResponseDTO` helper.
   - Call `listKudos`; handle happy path with 200 + JSON.
   - Wrap service call in try/catch; log errors and emit 500 response on failure.
4. Update any central error utilities or create helper for consistent `ErrorResponseDTO` formatting if not already present.
