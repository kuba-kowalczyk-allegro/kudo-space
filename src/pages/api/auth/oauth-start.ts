import type { APIRoute } from "astro";

import { createSupabaseServerClient } from "../../../db/supabase.client.ts";
import { OAuthStartSchema, sanitizeRedirect, assertProviderAllowed } from "../../../lib/validation/auth.ts";

export const prerender = false;

/**
 * POST /api/auth/oauth-start
 *
 * Initiates the OAuth authentication flow with GitHub
 * Validates the provider and redirect URL before starting OAuth
 *
 * Request body:
 * - provider: "github" (only GitHub is supported)
 * - redirectTo: Optional URL to redirect after successful auth
 *
 * Response:
 * - 303: Redirects to GitHub OAuth page
 * - 400: Invalid request (wrong provider, invalid redirect)
 * - 500: Server error during OAuth initialization
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Parse request body (supports both JSON and form data)
    const contentType = request.headers.get("content-type");
    let body: Record<string, unknown>;

    if (contentType?.includes("application/json")) {
      body = await request.json();
    } else {
      // Parse form data
      const formData = await request.formData();
      body = {
        provider: formData.get("provider"),
        redirectTo: formData.get("redirectTo") || undefined,
      };
    }

    const validation = OAuthStartSchema.safeParse(body);

    if (!validation.success) {
      // Log validation failure server-side with context
      // eslint-disable-next-line no-console
      console.error("OAuth validation failed:", {
        errors: validation.error.format(),
        provider: body.provider,
        redirectTo: body.redirectTo,
      });
      // Redirect to login page with error code per auth-spec.md
      return redirect("/login?error=invalid_request", 303);
    }

    const { provider, redirectTo } = validation.data;

    // Ensure provider matches configuration (only GitHub)
    const configuredProvider = import.meta.env.SUPABASE_OAUTH_PROVIDER || "github";
    try {
      assertProviderAllowed(provider, configuredProvider);
    } catch (error) {
      // Log provider mismatch server-side
      // eslint-disable-next-line no-console
      console.warn("Provider not allowed:", {
        requestedProvider: provider,
        configuredProvider,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Redirect to login page with error code per auth-spec.md
      return redirect("/login?error=invalid_request", 303);
    }

    // Sanitize redirect URL to prevent open redirects
    const siteUrl = import.meta.env.SITE_URL;
    const safeRedirect = sanitizeRedirect(redirectTo, siteUrl);

    // Build the callback URL with optional redirect parameter
    const callbackUrl = new URL("/auth/callback", siteUrl);
    if (safeRedirect) {
      callbackUrl.searchParams.set("redirectTo", safeRedirect);
    }

    // Create Supabase client and initiate OAuth
    const supabase = createSupabaseServerClient(request, cookies);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      // Log Supabase OAuth error server-side with context
      // eslint-disable-next-line no-console
      console.error("Supabase OAuth initialization failed:", {
        provider,
        error: error.message,
        callbackUrl: callbackUrl.toString(),
      });
      // Redirect to login page with provider error per auth-spec.md
      return redirect("/login?error=provider_unavailable", 303);
    }

    // Redirect to OAuth provider (GitHub)
    if (data.url) {
      return redirect(data.url, 303);
    }

    // No URL returned from Supabase - log and redirect with generic error
    // eslint-disable-next-line no-console
    console.error("No OAuth URL returned from Supabase:", {
      provider,
      hasData: !!data,
    });
    return redirect("/login?error=internal_error", 303);
  } catch (error) {
    // Log unexpected errors server-side without exposing details to client
    // eslint-disable-next-line no-console
    console.error("Unexpected error in OAuth start:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return redirect("/login?error=internal_error", 303);
  }
};
