# Vercel Project Setup Checklist

Follow these steps after linking the repository to Vercel to ensure all environments are configured correctly.

## 1. Create the Vercel Project
- Import the `kudo-space` repository and choose the Astro framework preset.
- Confirm install command `npm ci` and build command `npm run build`.
- Leave the output directory blank (handled by the Astro adapter).

## 2. Configure Environment Variables
- Add all keys from `.env.example` to both the **Preview** and **Development** environments using the shared Supabase dev/test project and GitHub OAuth app.
- Repeat the same keys for the **Production** environment but use the dedicated production Supabase project, production GitHub OAuth app credentials, and `SITE_URL=https://kudo-space.vercel.app` (or your custom domain).
- Keep Supabase service role keys server-only. Never expose them via the browser tab.

## 3. Domains & Traffic
- Assign the default `kudo-space.vercel.app` domain to production.
- Add custom domains if needed, update DNS records, and wait for verification before promoting builds.
- Enable automatic redirects from `www` to apex if a custom domain is used.

## 4. Analytics & Monitoring (Optional)
- Enable Vercel Web Analytics and/or Speed Insights if you want basic telemetry.
- Configure error tracking integrations as required for observability.

## 5. Preview & Production Promotion
- Allow Vercel to create preview deployments for every pull request.
- Promote previews to production from the Vercel dashboard or run `.github/workflows/vercel-deploy.yml` once changes land on `master`.

## 6. Access Control
- Grant collaborator access to the Vercel project if others need deployment rights.
- Rotate tokens and secrets periodically and revoke unused ones through the Vercel dashboard.
