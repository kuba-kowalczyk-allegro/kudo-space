import type { APIRoute } from "astro";
import { z } from "zod";

import type { SupabaseClient } from "../../../db/supabase.client.ts";
import { deleteKudo, DeleteKudoServiceError } from "../../../lib/services/kudos.service.ts";
import { kudoIdPathSchema } from "../../../lib/validation/kudos.ts";
import type { DeleteKudoResponseDTO, ErrorCode, ErrorDetails, ErrorResponseDTO } from "../../../types.ts";

export const prerender = false;

interface RequestLocals {
  supabase?: SupabaseClient;
  user?: { id: string };
}

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

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { supabase, user } = locals as RequestLocals;

  // Verify Supabase client is available
  if (!supabase) {
    /* eslint-disable-next-line no-console */
    console.error("Supabase client missing from request context.");
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  // Verify user is authenticated
  if (!user) {
    return buildErrorResponse(401, "UNAUTHORIZED", "Authentication required.");
  }

  // Validate path parameter (id)
  let validatedParams: { id: string };
  try {
    validatedParams = kudoIdPathSchema.parse({ id: params.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detailsEntries = error.issues.map((issue) => [issue.path.join(".") || "path", issue.message] as const);
      const details: ErrorDetails = Object.fromEntries(detailsEntries);

      return buildErrorResponse(400, "INVALID_UUID", "Invalid kudo ID format.", details);
    }

    /* eslint-disable-next-line no-console */
    console.error("Unexpected error while validating kudo id path parameter.", error);
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  // Attempt to delete the kudo
  try {
    const result = await deleteKudo(supabase, {
      id: validatedParams.id,
      requesterId: user.id,
    });

    const response: DeleteKudoResponseDTO = {
      message: "Kudo deleted successfully.",
      id: result.id,
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    // Handle known service errors
    if (error instanceof DeleteKudoServiceError) {
      return buildErrorResponse(error.status, error.code, error.message, error.details);
    }

    // Handle unexpected errors
    /* eslint-disable-next-line no-console */
    console.error("Failed to delete kudo.", {
      error,
      kudoId: validatedParams.id,
      userId: user.id,
    });
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }
};
