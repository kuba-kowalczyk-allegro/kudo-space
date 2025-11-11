import { z } from "zod";

/**
 * Schema for OAuth start request
 * Validates the provider and optional redirect URL
 */
export const OAuthStartSchema = z.object({
  provider: z.string().refine((val) => val === "github", {
    message: "Invalid OAuth provider. Only 'github' is supported.",
  }),
  redirectTo: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => val || undefined),
});

export type OAuthStartInput = z.infer<typeof OAuthStartSchema>;

/**
 * Validates and sanitizes a redirect URL
 * Ensures the URL is safe and points to the same origin
 *
 * @param redirectTo - The redirect URL to validate
 * @param siteUrl - The site's base URL for validation
 * @returns Sanitized redirect path or null if invalid
 */
export function sanitizeRedirect(redirectTo: string | undefined, siteUrl: string): string | null {
  if (!redirectTo) return null;

  try {
    // Parse the redirect URL
    const redirectUrl = new URL(redirectTo, siteUrl);
    const baseSiteUrl = new URL(siteUrl);

    // Only allow redirects to the same origin
    if (redirectUrl.origin !== baseSiteUrl.origin) {
      return null;
    }

    // Return just the pathname (without origin) to prevent open redirects
    return redirectUrl.pathname + redirectUrl.search + redirectUrl.hash;
  } catch {
    // If URL parsing fails, treat as relative path
    // Ensure it starts with / and doesn't contain protocol
    if (redirectTo.startsWith("/") && !redirectTo.includes("://")) {
      return redirectTo;
    }
    return null;
  }
}

/**
 * Asserts that the provider matches the configured OAuth provider
 * Throws an error if the provider is not allowed
 *
 * @param provider - The provider to check
 * @param configuredProvider - The configured OAuth provider from environment
 * @throws Error if provider doesn't match configuration
 */
export function assertProviderAllowed(provider: string, configuredProvider: string): void {
  if (provider !== configuredProvider) {
    throw new Error(`OAuth provider '${provider}' is not configured. Only '${configuredProvider}' is allowed.`);
  }
}
