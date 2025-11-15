# Vercel Hosting & Environment Plan

## 1. Project Review
- Tech stack: Astro 5 with React 19, TypeScript, Tailwind 4, Shadcn/ui, Supabase backend, OpenRouter for optional AI. Frontend is server-rendered with client React islands where needed.
- Current Astro config (`astro.config.mjs`): server output with `@astrojs/node` standalone adapter and Tailwind Vite plugin. To run on Vercel we will swap to the official Vercel adapter.
- Package scripts (`package.json`): `astro dev`, `astro build`, Vitest test suites, ESLint, Prettier. No Vercel-specific scripts yet; Astro defaults work with Vercel.
- Dependencies: includes Supabase client, @astrojs/node; lacking `@astrojs/vercel`. No Vercel CLI or adapters installed yet.
- Environment variables (`.env.example`): Supabase keys, OAuth provider info, site URL, OpenRouter API key, GitHub OAuth. No separation between local/test/prod; SITE_URL currently points to localhost.

## 2. Environment Strategy
- Keep two Supabase projects: one for production and one shared development/testing project used by both local work and automated E2E runs.
- Define three environment modes:
  - **Local development**: `.env.local` in repo root. Point Supabase keys to the development/testing project. Use `SITE_URL=http://localhost:4321`. Keep OpenRouter key optional.
  - **E2E tests**: CI-only environment file (e.g. `.env.test` stored in GitHub Actions secrets). Reuse the development/testing Supabase project to avoid extra maintenance. Set `SITE_URL` to Playwright test origin (likely `http://127.0.0.1:4321`). Seed minimal fixtures before tests and clean up afterwards if necessary.
  - **Production (Vercel)**: Configure Vercel Production environment variables with production Supabase keys and production domain `SITE_URL`. Preview deployments (Vercel Preview env) will leverage the production Supabase DB unless a staging DB is later introduced.
- Add `env.d.ts` updates if new variables appear.
- Document environment variable matrix in `/README.md` and ensure `.env.example` lists placeholders for any new variables (e.g. Vercel tokens for CI).

## 3. Project Adaptations for Vercel
- Replace Node adapter with Vercel Serverless adapter:
  - Add dependency: `@astrojs/vercel` (choose serverless runtime; edge not required yet).
  - Update `astro.config.mjs`:
    ```ts
    import vercel from "@astrojs/vercel/serverless";
    export default defineConfig({
      output: "server",
      adapter: vercel(),
      integrations: [react(), sitemap()],
      vite: { plugins: [tailwindcss()] },
    });
    ```
  - Remove `@astrojs/node` from dependencies and config once migration complete.
- Confirm Supabase usage is SSR-friendly; ensure no direct usage of node APIs that fail on Vercel serverless.
- Validate build command remains `astro build` and output directory defaults handled by adapter.
- Update documentation to reflect Vercel deployment requirements and environment variables.

## 4. Vercel Platform Setup
- Create Vercel project linked to GitHub repo `kudo-space`.
- Configure framework preset: Astro. Build command `npm run build`, install command `npm ci`, output left to adapter.
- Set environment variables:
  - Development (Vercel CLI/preview) mirrors local `.env.local` values pointed at the shared development/testing Supabase project.
  - Preview: same as production for Supabase unless adding future staging DB.
  - Production: production Supabase keys, production `SITE_URL` (e.g. `https://kudo-space.vercel.app` initially).
- Define custom domain after DNS ready.
- Enable Vercel Analytics if desired; optional.
- For Supabase service role keys, restrict usage to server-side code only (Astro server routes) and never expose to client. Consider storing service role in Vercel encrypted env variables only when necessary.

## 5. GitHub Actions Deployment Workflow
- Prefer native Vercel Git/GitHub integration for automatic Preview + Production deployments on push.
- Add GitHub Action for explicit control (e.g. manual deploy, nightly) using `vercel` CLI:
  - Secrets required: `VERCEL_TOKEN` (personal/token), `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, plus environment-specific Supabase vars for test stage.
  - Example workflow (`.github/workflows/vercel-deploy.yml`):
    ```yaml
    name: Deploy to Vercel

    on:
      push:
        branches: [main]
      workflow_dispatch: {}

    jobs:
      deploy:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: 20
          - run: npm ci
          - run: npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
          - run: npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
          - run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
    ```
  - Configure Preview deployments via separate job triggered on pull requests (`vercel deploy --prebuilt`).
  - Inject Supabase development/testing credentials in workflows dedicated to tests (e.g. before running Playwright).

## 6. End-to-End Test Integration Plan
- Create GitHub Action workflow for E2E tests that:
  - Spins up Preview deployment via `vercel deploy` or uses `astro dev` locally with env `.env.test`.
  - Runs migrations/seed script against the shared development/testing Supabase project before tests to ensure deterministic fixtures.
  - Executes Playwright suite (when available) with Supabase testing credentials and ephemeral Vercel deployment URL.
  - Tears down resources if required (e.g. clean database using Supabase SQL script) to keep the shared testing dataset tidy.

## 7. Next Steps Checklist
1. Install `@astrojs/vercel` and update `astro.config.mjs`; remove Node adapter.
2. Update `.env.example` to include placeholders for Vercel and Supabase testing secrets (VERCEL_TOKEN, ORG_ID, PROJECT_ID, SUPABASE_TEST_*).
3. Create `.env.local` template for local dev and document usage.
4. Configure Supabase projects: ensure production project has RLS policies ready for production; seed the shared development/testing project for local and E2E scenarios.
5. Create Vercel project, connect repo, set environment variables for Development/Preview/Production.
6. Add GitHub Actions workflow for Vercel deployment and, later, separate workflow for E2E tests using the shared testing Supabase project.
7. Update README with deployment instructions, environment matrix, and Supabase project IDs.
