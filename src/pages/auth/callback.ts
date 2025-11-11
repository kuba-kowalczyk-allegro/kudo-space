import type { APIRoute } from "astro";

import { createSupabaseServerClient } from "../../db/supabase.client.ts";
import { ensureProfile } from "../../lib/services/profiles.service.ts";
import { sanitizeRedirect } from "../../lib/validation/auth.ts";

export const prerender = false;

/**
 * GET /auth/callback
 *
 * Handles the OAuth callback from GitHub
 * Exchanges the authorization code for a session and ensures user profile exists
 *
 * Query parameters:
 * - code: Authorization code from GitHub (required by Supabase)
 * - redirectTo: Optional URL to redirect after successful auth
 * - error: OAuth error if authentication failed
 * - error_description: Description of OAuth error
 *
 * Response:
 * - 303: Redirects to app (/) or specified redirectTo on success
 * - 303: Redirects to login with error parameter on failure
 */
export const GET: APIRoute = async ({ request, cookies, redirect, url }) => {
  const siteUrl = import.meta.env.SITE_URL;

  // Check for OAuth errors from provider
  const error = url.searchParams.get("error");
  if (error) {
    const errorCode = error === "access_denied" ? "access_denied" : "callback_failed";

    return redirect(`/login?error=${errorCode}`, 303);
  }

  try {
    // Create Supabase client
    const supabase = createSupabaseServerClient(request, cookies);

    // Exchange code for session
    // Supabase automatically handles the code from query params
    const { data, error: authError } = await supabase.auth.exchangeCodeForSession(url.searchParams.get("code") || "");

    if (authError || !data.session || !data.user) {
      return redirect("/login?error=callback_failed", 303);
    }

    // Ensure user profile exists in database
    const profile = await ensureProfile(supabase, data.user);

    if (!profile) {
      // Profile creation failed but session is valid
      // User can still access the app, log for debugging
      // eslint-disable-next-line no-console
      console.warn("Profile creation failed for user:", data.user.id);
    }

    // Determine redirect destination
    const redirectTo = url.searchParams.get("redirectTo");
    const safeRedirect = sanitizeRedirect(redirectTo || undefined, siteUrl);

    // Redirect to intended destination or home
    return redirect(safeRedirect || "/", 303);
  } catch {
    // Unexpected error during callback processing
    return redirect("/login?error=callback_failed", 303);
  }
};
