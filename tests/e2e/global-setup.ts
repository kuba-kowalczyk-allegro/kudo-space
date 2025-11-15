import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

const ENV_TEST_PATH = path.resolve(process.cwd(), ".env.test");

function loadTestEnvironment(): void {
  loadEnv({ path: ENV_TEST_PATH, override: false });
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function extractProjectRef(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const [projectRef] = hostname.split(".");
    if (!projectRef) {
      throw new Error(`Unable to parse project reference from hostname: ${hostname}`);
    }

    return projectRef;
  } catch (error) {
    throw new Error(`Failed to extract Supabase project reference from URL: ${url}. ${(error as Error).message}`);
  }
}

export default async function globalSetup(): Promise<void> {
  loadTestEnvironment();

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_KEY");
  const email = requireEnv("SUPABASE_E2E_USER_EMAIL");
  const password = requireEnv("SUPABASE_E2E_USER_PASSWORD");
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Supabase authentication failed: ${error.message}`);
  }

  const session = data.session;
  if (!session) {
    throw new Error("Supabase sign-in did not return a session object");
  }

  const projectRef = extractProjectRef(supabaseUrl);

  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000 + (session.expires_in ?? 3600)),
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  const browser = await chromium.launch();
  const context = await browser.newContext();

  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: cookieValue,
      url: baseURL,
      httpOnly: true,
      secure: baseURL.startsWith("https"),
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000 + (session.expires_in ?? 3600)),
    },
  ]);

  const authDir = path.join(process.cwd(), "tests/e2e/.auth");
  await fs.mkdir(authDir, { recursive: true });

  const storageStatePath = path.join(authDir, "state.json");
  await context.storageState({ path: storageStatePath });

  await browser.close();
}
