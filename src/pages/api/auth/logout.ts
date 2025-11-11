import type { APIRoute } from "astro";

import { createSupabaseServerClient } from "../../../db/supabase.client.ts";

export const prerender = false;

/**
 * POST /api/auth/logout
 *
 * Signs out the current user and clears session cookies
 * Redirects to login page with info message
 *
 * Response:
 * - 303: Redirects to /login?info=logged_out
 * - 500: Server error during sign out
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Create Supabase client
    const supabase = createSupabaseServerClient(request, cookies);

    // Sign out the user (clears session and cookies)
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Even if sign out fails on server, redirect to login
      // The client-side cookies will be cleared anyway
      return redirect("/login?error=logout_failed", 303);
    }

    // Redirect to login with success message
    return redirect("/login?info=logged_out", 303);
  } catch {
    // On unexpected error, still redirect to login
    return redirect("/login?error=logout_failed", 303);
  }
};
