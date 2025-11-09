import type { APIRoute } from "astro";
import { z } from "zod";

import type { SupabaseClient } from "../../../db/supabase.client.ts";
import { listKudos } from "../../../lib/services/kudos.service.ts";
import type { ErrorCode, ErrorDetails, ErrorResponseDTO } from "../../../types.ts";

export const prerender = false;

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

const listKudosQuerySchema = z.object({
  limit: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return DEFAULT_LIMIT;
      }
      if (typeof value === "string") {
        return Number(value);
      }
      return value;
    },
    z
      .number({ invalid_type_error: "limit must be a number" })
      .int({ message: "limit must be an integer" })
      .min(1, { message: "limit must be at least 1" })
      .max(100, { message: "limit must be at most 100" })
  ),
  offset: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") {
        return DEFAULT_OFFSET;
      }
      if (typeof value === "string") {
        return Number(value);
      }
      return value;
    },
    z
      .number({ invalid_type_error: "offset must be a number" })
      .int({ message: "offset must be an integer" })
      .min(0, { message: "offset must be at least 0" })
  ),
});

export type ListKudosQuery = z.infer<typeof listKudosQuerySchema>;

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
  }

  const { supabase } = locals as RequestLocals;

  if (!supabase) {
    /* eslint-disable-next-line no-console */
    console.error("Supabase client missing from request context.");
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  let query: ListKudosQuery;
  try {
    query = listKudosQuerySchema.parse({
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detailsEntries = error.issues.map((issue) => [issue.path.join(".") || "query", issue.message] as const);
      const details: ErrorDetails = Object.fromEntries(detailsEntries);

      return buildErrorResponse(400, "INVALID_PARAMETERS", "Invalid query parameters.", details);
    }

    /* eslint-disable-next-line no-console */
    console.error("Unexpected error while validating list kudos query.", error);
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  try {
    const result = await listKudos(supabase, query);
    return Response.json(result, { status: 200 });
  } catch (error) {
    /* eslint-disable-next-line no-console */
    console.error("Failed to retrieve kudos.", { error, query });
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }
};
