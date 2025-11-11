import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";

import type { Database } from "../db/database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * Type definition for the Supabase client with our database schema
 * This is the type returned by createSupabaseServerClient
 */
export type SupabaseClient = SupabaseClientType<Database>;

/**
 * Creates a Supabase server client for SSR contexts (pages, middleware, API routes)
 * Handles cookie management for authentication state
 *
 * This client MUST be used in all server-side contexts (middleware, API routes, Astro pages)
 * because it properly manages authentication cookies for the OAuth flow.
 *
 * @param request - The incoming request object to read cookies from
 * @param cookies - Astro cookies object for writing session cookies
 * @returns Supabase client configured for server-side rendering with cookie-based auth
 *
 * @example
 * // In middleware or API route
 * const supabase = createSupabaseServerClient(context.request, context.cookies);
 * const { data: { user } } = await supabase.auth.getUser();
 */
export function createSupabaseServerClient(request: Request, cookies: AstroCookies): SupabaseClient {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) return [];

        // Parse cookie header into name-value pairs
        return cookieHeader.split("; ").map((cookie: string) => {
          const [name, ...valueParts] = cookie.split("=");
          return { name, value: valueParts.join("=") };
        });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
