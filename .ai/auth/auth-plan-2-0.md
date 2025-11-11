# Auth Security Hardening Plan 2.0

## Objectives

- Restore database row-level security (RLS) while keeping local developer workflows smooth.
- Firm up server-side auth/session handling and align API responses with the auth specification.
- Introduce CSRF protections and consistent authorization checks across existing and future endpoints.
- Prevent accidental leakage of privileged Supabase credentials to the client bundle.

## Workstreams & Tasks

### 1. Re-enable RLS & Policies

- Create a new migration `20251107000005_enable_rls.sql` (or next timestamp) that:
  - Runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for `profiles`, `kudos`, and `kudos_with_users`.
  - Recreates the policies from `.ai/db-plan.md` for each table/view.
  - Adds `ALTER TABLE ... FORCE ROW LEVEL SECURITY` where appropriate.
- Document in the migration header that `20251107000004_disable_rls_policies.sql` was a temporary local-only change and is now superseded.
- Run `supabase db reset` (or `supabase db push`) locally to ensure seed + new policies succeed.
- Verify CRUD paths against the Supabase dashboard to confirm policies behave as expected (e.g., insert rejects mismatched `sender_id`).

### 2. OAuth Start Flow Alignment

- Refactor `/api/auth/oauth-start` to:
  - Always redirect to `/login?error=<code>` on validation failures, matching `.ai/auth/auth-spec.md`.
  - Log validation and provider errors server-side via `console.error` / `console.warn` with contextual data (provider, redirect target) but without leaking tokens.
  - Continue redirecting to provider on success; return a generic `/login?error=internal_error` if Supabase returns no URL.

### 3. Service Role Key Containment

- Audit the codebase to ensure `SUPABASE_SERVICE_ROLE_KEY` is never imported outside server-only contexts.
