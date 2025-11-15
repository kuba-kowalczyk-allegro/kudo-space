# Playwright E2E Implementation Plan

## 1. Objectives
- Stand up a minimal Playwright test suite that can run locally and in CI against the shared Supabase development/testing project described in `.ai/hosting-plan.md`.
- Automate authentication without relying on the GitHub OAuth UI flow by performing an email/password sign-in with the anon client.
- Exercise a smoke-level user flow that mirrors FR-003/FR-004 from `.ai/testing/test-plan.md`: authenticated user sees the Kudos board and can post a kudo.
- Rely on two **manually provisioned** Supabase auth users (primary E2E user + teammate recipient) whose identifiers are passed exclusively through environment variables.

## 2. High-Level Strategy
- **Session bootstrap**: Sign in the manually provisioned test user with the Supabase anon client and email/password credentials sourced from `.env.test`. Persist the returned `access_token`/`refresh_token` pair as Supabase cookies in Playwright before the first page navigation.
- **Fixture-driven setup**: Implement a global Playwright fixture that verifies prerequisite data (profiles, baseline kudos) via internal Astro API routes or direct Supabase REST calls using the anon client; avoid write operations from within the suite.
- **Smoke scenario**: With the session in place, navigate to `/`, assert the board loads, submit the create-kudo form, and verify the new entry renders.
- **Environment isolation**: Drive the test suite with a dedicated `.env.test` file that mirrors the "E2E tests" mode defined in the hosting plan. Never reuse production Supabase keys.
- **Manual data discipline**: Do not seed or mutate data from within Playwright fixtures/tests. Instead, maintain the shared state via a checked-in SQL script that operators execute manually before the suite runs.

## 3. Detailed Steps

### 3.1 Dependencies & Project Wiring
- Add Playwright as a dev dependency (`@playwright/test`) and generate base config with `npx playwright install --with-deps` (document manual browser install requirement for CI/macOS).
- Extend `package.json` with `test:e2e` script (`playwright test`) and optional `test:e2e:ui` (`playwright test --ui`).
- Commit initial `playwright.config.ts` with:
  - `testDir: "tests/e2e"` (folder already exists but empty).
  - `use.baseURL` pointing to `process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321"`.
  - `use.storageState` referencing a generated auth state file (see §3.2).
  - `globalSetup` script to mint the Supabase session and write storage state.
  - CI-friendly defaults (`retries`, `timeout`, `fullyParallel: false` initially).

### 3.2 Global Auth Setup
- Register two auth users manually in the Supabase dashboard:
  - **Primary E2E user**: used to authenticate Playwright sessions.
  - **Recipient teammate**: selectable inside the create-kudo modal.
- Record the following details for each user and store them exclusively in `.env.test` (see §3.5): user IDs (`auth.users.id`), emails, and display names.
- Create `tests/e2e/global-setup.ts` that:
  1. Loads `.env.test` using `dotenv` (include `SUPABASE_TEST_URL`, `SUPABASE_ANON_KEY`, `PLAYWRIGHT_BASE_URL`, `SUPABASE_E2E_USER_EMAIL`, `SUPABASE_E2E_USER_PASSWORD`, `SUPABASE_E2E_USER_ID`).
  2. Instantiates a standard Supabase client with the anon key: `createClient(SUPABASE_TEST_URL, SUPABASE_ANON_KEY)`.
  3. Calls `supabase.auth.signInWithPassword({ email: process.env.SUPABASE_E2E_USER_EMAIL, password: process.env.SUPABASE_E2E_USER_PASSWORD })` to obtain the session tokens. This requires the manually provisioned user to have a known password and email/password auth to be enabled in the testing project.
  4. Launches a headless Chromium context and calls `context.addCookies(...)` to persist the Supabase auth cookie structure (`sb-${projectRef}-auth-token`) using the tokens returned in step 3.
  5. Saves storage state to `tests/e2e/.auth/state.json` for reuse.
- Document the cookie naming pattern (Supabase v2: `sb-${projectRef}-auth-token` JSON with `access_token`/`refresh_token`). Validate once manually and mirror that structure in code.

- Do **not** create or mutate Supabase users or profiles from Playwright fixtures.
- Maintain deterministic state via a manual SQL script (see §3.6). Operators run it against the testing project before executing the suite.
- Optional utility: expose `tests/e2e/utils/supabase.ts` with read-only helpers (e.g., verify profile presence) that rely on env-provided IDs, but avoid insert/update/delete calls.

### 3.4 Single Smoke Test Scenario
- In `tests/e2e/kudos-board.spec.ts`:
  1. Use `test.use({ storageState: path.join(__dirname, ".auth/state.json") })`.
  2. `test('authenticated user can manage kudos end-to-end', async ({ page }) => { ... })`.
  3. Steps: navigate to `/`; wait for board to render (skeleton replaced); assert existing kudos (read phase); open create modal; fill recipient combobox using `process.env.SUPABASE_E2E_RECIPIENT_NAME`; type message; submit; verify new card renders; trigger delete action on the newly added kudo; confirm toast and ensure board returns to original count.
  4. Use `test.step` to align with test plan checklists (login bypass, board load, create flow, cleanup).
- Include retry-friendly selectors (data-test attributes) to avoid brittle reliance on text; add them in React components if needed (feature flag). Document any required additions.
- Avoid relying on message text persisted across runs—compose ephemeral messages (e.g., timestamp suffix) but immediately delete them to keep the database pristine.

### 3.5 Environment & Configuration Artifacts
- Introduce `.env.test` template mirroring hosting plan with **all** secrets and user metadata:
  - `SUPABASE_TEST_URL`
  - `SUPABASE_ANON_KEY`
  - `PLAYWRIGHT_BASE_URL` (defaults to `http://127.0.0.1:4321`)
  - `SUPABASE_E2E_USER_EMAIL`
  - `SUPABASE_E2E_USER_PASSWORD`
  - `SUPABASE_E2E_USER_ID`
  - `SUPABASE_E2E_USER_DISPLAY_NAME`
  - `SUPABASE_E2E_RECIPIENT_ID`
  - `SUPABASE_E2E_RECIPIENT_EMAIL`
  - `SUPABASE_E2E_RECIPIENT_DISPLAY_NAME`
- Never embed these values directly in source files—always read them via `process.env`.
- Update `.env.example` and README environment matrix to include testing variables per hosting plan instructions.
- Ensure `vitest.config.ts` or other bundlers ignore Playwright folder (if needed) and add `.gitignore` entry for `tests/e2e/.auth/state.json`.

### 3.6 Manual SQL Seeding Script
- Add a file under `supabase/migrations` or `supabase/seeds` (e.g., `supabase/seed/e2e_seed.sql`) containing the following template. Operators replace placeholders with the manually captured user UUIDs/emails before execution:

```sql
-- Ensure both users already exist in auth.users (created manually via Supabase dashboard)
-- Replace {{}} placeholders before running.

INSERT INTO profiles (id, display_name, avatar_url)
VALUES
  ('{{E2E_USER_ID}}', '{{E2E_USER_DISPLAY_NAME}}', NULL),
  ('{{RECIPIENT_USER_ID}}', '{{RECIPIENT_DISPLAY_NAME}}', NULL)
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Optional baseline kudos from recipient to e2e user for board sanity checks
INSERT INTO kudos (id, sender_id, recipient_id, message)
VALUES
  (gen_random_uuid(), '{{RECIPIENT_USER_ID}}', '{{E2E_USER_ID}}', 'Great job keeping the board clean!')
ON CONFLICT DO NOTHING;

-- Clean slate helper (run manually before suite) – uncomment as needed
-- DELETE FROM kudos WHERE sender_id IN ('{{E2E_USER_ID}}', '{{RECIPIENT_USER_ID}}')
--   OR recipient_id IN ('{{E2E_USER_ID}}', '{{RECIPIENT_USER_ID}}');
```

- Document in README that this script must be executed manually ahead of the Playwright run and **never** from within the tests or fixtures.

### 3.7 CI Integration (Follow-up)
- Later, wire GitHub Actions job that:
  - Installs browsers (`npx playwright install --with-deps`).
  - Exports `.env.test` secrets from GitHub (`SUPABASE_TEST_URL`, `SUPABASE_ANON_KEY`, etc.).
  - Runs `npm run build && npm run preview -- --host 0.0.0.0 --port 4321` in background and executes Playwright against preview URL.
- Reuse Vercel testing Supabase project; ensure cleanup script truncates `kudos` after run.

## 4. Open Questions / Risks
- Confirm Supabase auth cookie name format in current Astro stack (may differ between SDK versions). Action: capture actual cookie post-login manually and encode identical structure in global setup.
- Ensure email/password auth is enabled for the shared testing Supabase project and that manually created users have known passwords.
- If direct SQL changes are required, handle them via the manual seed script rather than ad-hoc mutations inside the test harness.

## 5. Next Actions Checklist
1. Capture Supabase cookie naming scheme from a real login session.
2. Manually provision the two auth users and record their IDs/emails.
3. Implement `tests/e2e/global-setup.ts` using email/password auth and storage state output.
4. Check in and manually execute `supabase/seed/e2e_seed.sql` before running tests.
5. Add Playwright smoke test covering read/create/delete kudo flow.
6. Document `.env.test` usage and update README/env examples.
