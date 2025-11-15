# Vercel Hosting & Environment Plan

## 1. Project Review
- Tech stack: Astro 5 with React 19, TypeScript, Tailwind 4, Shadcn/ui, Supabase backend, OpenRouter for optional AI. Frontend is server-rendered with client React islands where needed.
- Current Astro config (`astro.config.mjs`): server output with `@astrojs/node` standalone adapter and Tailwind Vite plugin. To run on Vercel we will swap to the official Vercel adapter.
- Package scripts (`package.json`): `astro dev`, `astro build`, Vitest test suites, ESLint, Prettier. No Vercel-specific scripts yet; Astro defaults work with Vercel.
- Dependencies: includes Supabase client, @astrojs/node; lacking `@astrojs/vercel`. No Vercel CLI or adapters installed yet.
- Testing: Playwright end-to-end suite configured; GitHub Actions `test` environment supplies `.env.test` secrets.
- Environment variables (`.env.example`, `.env.test.example`): Supabase keys, OAuth provider info, site URL, OpenRouter API key, GitHub OAuth. Local development and test share the same credentials, while production will use distinct values tracked via `.env.production` (not committed).

## 2. Environment Strategy
- Maintain two Supabase projects: one shared development/testing project and one dedicated production project.
- Use three environment files with mirrored key sets:
  - **Local development**: `.env` (documented in `.env.example`). Points to the shared development/testing Supabase project and GitHub OAuth app. `SITE_URL=http://localhost:4321`.
  - **E2E tests**: `.env.test` (documented in `.env.test.example`). Loaded in GitHub Actions via the `test` environment secrets. Uses the same Supabase project and GitHub OAuth credentials as local development. `SITE_URL` aligns with the Playwright origin (e.g. `http://127.0.0.1:4321`).
  - **Production (Vercel)**: `.env.production` (same keys as `.env`, different values). Not to be commited. Vercel production should mirror these values. Uses a separate Supabase project and GitHub OAuth application, with `SITE_URL` set to the public domain.
- Keep `env.d.ts` in sync if new variables are introduced.
- Document the environment matrix in `README.md`, highlighting which variables differ between development/testing and production.

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
- Create a Vercel project linked to the GitHub repo `kudo-space`.
- Configure framework preset: Astro. Build command `npm run build`, install command `npm ci`, output handled by the adapter.
- Set environment variables per Vercel environment:
  - **Development/Preview**: copy values from `.env`/`.env.test` so deployments continue using the shared development/testing Supabase project and GitHub OAuth app.
  - **Production**: use `.env.production` values, pointing to the dedicated production Supabase project and GitHub OAuth app, with `SITE_URL` set to the live domain (e.g. `https://kudo-space.vercel.app`).
- Define the custom domain after DNS is ready.
- Enable Vercel Analytics only if needed.
- Store Supabase service role keys exclusively in encrypted Vercel environment variables; never expose them to the client.

## 5. GitHub Actions Deployment Workflow
- Keep Vercel's automatic Preview deployments for pull requests if desired, but require manual promotion for production.
- Create a GitHub Action (`.github/workflows/vercel-deploy.yml`) that can only be triggered manually (`workflow_dispatch`) after changes land on the `master` branch.
  - Secrets required: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, plus any Supabase credentials needed for build-time operations.
  - Suggested job outline:
    ```yaml
    name: Deploy Production

    on:
      workflow_dispatch:
        inputs:
          ref:
            description: Ref to deploy (defaults to master)
            default: master
            required: true

    jobs:
      deploy:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
            with:
              ref: ${{ inputs.ref }}
          - uses: actions/setup-node@v4
            with:
              node-version: 20
          - run: npm ci
          - run: npx vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
          - run: npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
          - run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
    ```
- Keep the Playwright workflow separate; it should load `.env.test` secrets from the GitHub `test` environment before running tests.

## 6. End-to-End Tests
Already implemented and used in pull-request github actions workflow. Should not be modified.

## 7. Next Steps Checklist
1. Install `@astrojs/vercel` and update `astro.config.mjs`; remove the Node adapter once verified.
2. Ensure `.env.example` and `.env.test.example` remain aligned with the actual `.env` and `.env.test` files. Add `.env.production` guidance where appropriate.
3. Document the shared development/testing Supabase project and GitHub OAuth app, plus the separate production counterparts, in `README.md`.
4. Create or update the manual `workflow_dispatch` deployment workflow targeting the `master` branch.
5. Set up Vercel environment variables for Development/Preview (shared project) and Production (dedicated project), including any needed analytics or feature flags.
