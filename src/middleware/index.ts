import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerClient } from "../db/supabase.client.ts";

/**
 * Routes that don't require authentication
 * These routes are accessible to all users, authenticated or not
 */
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/api/auth/oauth-start", "/api/auth/logout"];

/**
 * Check if a path matches any public route
 * Supports exact matches and prefix matches for static assets
 */
function isPublicRoute(pathname: string): boolean {
  // Allow all static assets
  if (pathname.startsWith("/_astro/") || pathname.startsWith("/favicon")) {
    return true;
  }

  // Check exact matches for public routes
  return PUBLIC_ROUTES.some((route) => pathname === route);
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Create a Supabase server client with proper cookie handling for this request
  const supabase = createSupabaseServerClient(context.request, context.cookies);
  context.locals.supabase = supabase;

  // Get the current user (authenticated by Supabase Auth server)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Attach user to context (null if not authenticated or error)
  context.locals.user = user && !error ? user : null;

  // If user is authenticated, fetch and attach their profile
  if (user && !error) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    context.locals.profile = profile || null;
  } else {
    context.locals.profile = null;
  }

  // Check if the current route is public
  const pathname = new URL(context.request.url).pathname;
  const isPublic = isPublicRoute(pathname);

  // If route is public, allow access
  if (isPublic) {
    return next();
  }

  // If route requires auth and user is not authenticated, redirect to login
  if (!context.locals.user) {
    // Preserve the original URL to redirect back after login
    const redirectTo = encodeURIComponent(pathname);
    return context.redirect(`/login?redirectTo=${redirectTo}&info=session_required`);
  }

  // User is authenticated, allow access
  return next();
});
