import type { APIRoute } from "astro";
import { z } from "zod";

import type { SupabaseClient } from "../../../db/supabase.client.ts";
import { listUsers } from "../../../lib/services/profiles.service.ts";
import type { ErrorCode, ErrorDetails, ErrorResponseDTO, UserListResponseDTO } from "../../../types.ts";

export const prerender = false;

const MAX_SEARCH_LENGTH = 100;

/**
 * Zod schema for validating query parameters
 * - search: optional string, trimmed and length-limited
 * - exclude_me: optional boolean, defaults to true, accepts true/false/1/0
 */
const listUsersQuerySchema = z.object({
  search: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }
      if (typeof value === "string") {
        return value.trim();
      }
      return value;
    },
    z
      .string({ invalid_type_error: "search must be a string" })
      .max(MAX_SEARCH_LENGTH, { message: `search must be at most ${MAX_SEARCH_LENGTH} characters` })
      .optional()
  ),
  exclude_me: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return true; // default value
      }
      if (typeof value === "string") {
        const lowerValue = value.toLowerCase();
        if (lowerValue === "true" || lowerValue === "1") {
          return true;
        }
        if (lowerValue === "false" || lowerValue === "0") {
          return false;
        }
      }
      return value;
    },
    z.boolean({ invalid_type_error: "exclude_me must be a boolean (true/false or 1/0)" })
  ),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/**
 * Builds a standardized error response
 *
 * @param status - HTTP status code
 * @param code - Error code from ErrorCode type
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns JSON response with error payload
 */
const buildErrorResponse = (status: number, code: ErrorCode, message: string, details?: ErrorDetails) => {
  const payload: ErrorResponseDTO = {
    error: {
      message,
      code,
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
    },
  };

  return Response.json(payload, { status });
};

export const GET: APIRoute = async ({ locals, url }) => {
  interface RequestLocals {
    supabase?: SupabaseClient;
    user?: { id: string };
  }

  const { supabase, user } = locals as RequestLocals;

  // Check for authenticated user
  if (!user) {
    return buildErrorResponse(401, "UNAUTHORIZED", "Authentication required.");
  }

  // Check for Supabase client
  if (!supabase) {
    /* eslint-disable-next-line no-console */
    console.error("Supabase client missing from request context.");
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  // Parse and validate query parameters
  let query: ListUsersQuery;
  try {
    query = listUsersQuerySchema.parse({
      search: url.searchParams.get("search") ?? undefined,
      exclude_me: url.searchParams.get("exclude_me") ?? undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detailsEntries = error.issues.map((issue) => [issue.path.join(".") || "query", issue.message] as const);
      const details: ErrorDetails = Object.fromEntries(detailsEntries);

      return buildErrorResponse(400, "INVALID_PARAMETERS", "Invalid query parameters.", details);
    }

    /* eslint-disable-next-line no-console */
    console.error("Unexpected error while validating list users query.", error);
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  // Fetch users from the service
  try {
    const users = await listUsers(supabase, {
      requesterId: user.id,
      search: query.search,
      excludeMe: query.exclude_me,
    });

    const response: UserListResponseDTO = {
      data: users,
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error("Failed to retrieve users.", { error, userId: user.id, search: query.search });
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }
};
