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
      // eslint-disable-next-line no-console
      console.error("OAuth validation failed:", validation.error.format());
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: validation.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { provider, redirectTo } = validation.data;

    // Ensure provider matches configuration (only GitHub)
    const configuredProvider = import.meta.env.SUPABASE_OAUTH_PROVIDER || "github";
    try {
      assertProviderAllowed(provider, configuredProvider);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Provider not allowed",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
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
      return new Response(
        JSON.stringify({
          error: "Failed to initiate authentication",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Redirect to OAuth provider (GitHub)
    if (data.url) {
      return redirect(data.url, 303);
    }

    return new Response(
      JSON.stringify({
        error: "No redirect URL received from OAuth provider",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
