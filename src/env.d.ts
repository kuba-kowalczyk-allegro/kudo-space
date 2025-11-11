/// <reference types="astro/client" />

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "./db/supabase.client.ts";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user: User | null;
      profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
    }
  }
}

/**
 * Environment variables available in the application.
 *
 * SECURITY NOTE: Environment variables without the PUBLIC_ prefix are NEVER
 * exposed to the client bundle. They are only available in server-side contexts
 * (middleware, API routes, SSR pages).
 *
 * CRITICAL: SUPABASE_SERVICE_ROLE_KEY must NEVER be used in client-side code
 * or imported in files that run on the client. This key bypasses RLS and grants
 * full database access. Only use in server-side admin operations if needed.
 *
 * For all client-side Supabase operations, use createSupabaseServerClient()
 * which correctly uses the SUPABASE_KEY (anon key) with RLS enforcement.
 */
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  /** SERVER-ONLY: Never expose to client. Used only for admin operations bypassing RLS. */
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly SUPABASE_OAUTH_PROVIDER: string;
  readonly SITE_URL: string;
  readonly OPENROUTER_API_KEY: string;
  readonly GITHUB_CLIENT_ID: string;
  readonly GITHUB_CLIENT_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
