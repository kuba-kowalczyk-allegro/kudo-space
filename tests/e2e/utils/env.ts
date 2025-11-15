import path from "node:path";
import { config as loadEnv } from "dotenv";

const ENV_TEST_PATH = path.resolve(process.cwd(), ".env.test");
let isLoaded = false;

function ensureLoaded(): void {
  if (isLoaded) return;
  loadEnv({ path: ENV_TEST_PATH, override: false });
  isLoaded = true;
}

export function requireEnv(key: string): string {
  ensureLoaded();
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function optionalEnv(key: string, fallback?: string): string | undefined {
  ensureLoaded();
  const value = process.env[key];
  return value ?? fallback;
}
