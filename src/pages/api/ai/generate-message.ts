import type { APIRoute } from "astro";
import { z } from "zod";

import type { SupabaseClient } from "../../../db/supabase.client.ts";
import {
  ConfigurationError,
  createOpenRouterService,
  NetworkError,
  ParseError,
  RateLimitError,
  ServiceUnavailableError,
  ValidationError,
} from "../../../lib/services/openrouter.service.ts";
import { generateMessageBodySchema } from "../../../lib/validation/ai.ts";
import type { ErrorCode, ErrorDetails, ErrorResponseDTO, GeneratedMessageResponseDTO } from "../../../types.ts";

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

export const POST: APIRoute = async ({ locals, request }) => {
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

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return buildErrorResponse(400, "INVALID_PARAMETERS", "Invalid JSON in request body.");
  }

  let validatedBody: { prompt: string };
  try {
    validatedBody = generateMessageBodySchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detailsEntries = error.issues.map((issue) => {
        const path = issue.path.join(".") || "body";
        const message = issue.message;

        // Map Zod validation errors to specific error codes
        if (path === "prompt") {
          if (message.includes("at least 10")) {
            return ["prompt", "Prompt must be at least 10 characters"] as const;
          }
          if (message.includes("at most 200")) {
            return ["prompt", "Prompt must be at most 200 characters"] as const;
          }
          if (message.includes("must be a string")) {
            return ["prompt", "Prompt must be a string"] as const;
          }
        }

        return [path, message] as const;
      });

      const details: ErrorDetails = Object.fromEntries(detailsEntries);
      const firstIssue = error.issues[0];
      const firstMessage = firstIssue?.message || "";

      // Return appropriate error code based on validation issue
      if (firstMessage.includes("at least 10")) {
        return buildErrorResponse(400, "PROMPT_TOO_SHORT", "Prompt is too short.", details);
      }
      if (firstMessage.includes("at most 200")) {
        return buildErrorResponse(400, "PROMPT_TOO_LONG", "Prompt is too long.", details);
      }

      return buildErrorResponse(400, "INVALID_PROMPT", "Invalid prompt.", details);
    }

    /* eslint-disable-next-line no-console */
    console.error("Unexpected error while validating prompt.", error);
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  // Create OpenRouter service and generate message
  try {
    const openRouterService = createOpenRouterService();

    // Convert the prompt into structured input for the AI service
    const result = await openRouterService.completeKudoMessage({
      recipient: "colleague",
      highlight: validatedBody.prompt,
      tone: "grateful",
      length: "medium",
    });

    const response: GeneratedMessageResponseDTO = {
      message: result.message,
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    // Handle OpenRouter service errors
    if (error instanceof ConfigurationError) {
      /* eslint-disable-next-line no-console */
      console.error("OpenRouter configuration error.", { error: error.message });
      return buildErrorResponse(500, "INTERNAL_ERROR", "AI service configuration error.");
    }

    if (error instanceof ValidationError) {
      /* eslint-disable-next-line no-console */
      console.error("OpenRouter validation error.", { error: error.message, prompt: validatedBody.prompt });
      return buildErrorResponse(400, "INVALID_PROMPT", error.message);
    }

    if (error instanceof RateLimitError) {
      const details: ErrorDetails = {
        service: "OpenRouter.ai",
      };

      if (error.retryAfter) {
        details.retry_after = error.retryAfter;
      }

      return buildErrorResponse(
        503,
        "AI_SERVICE_UNAVAILABLE",
        "AI service rate limit exceeded. Please try again later.",
        details
      );
    }

    if (error instanceof ServiceUnavailableError) {
      const details: ErrorDetails = {
        service: "OpenRouter.ai",
      };

      if (error.correlationId) {
        details.correlation_id = error.correlationId;
      }

      return buildErrorResponse(
        503,
        "AI_SERVICE_UNAVAILABLE",
        "AI service is temporarily unavailable. Please write your message manually.",
        details
      );
    }

    if (error instanceof NetworkError) {
      const details: ErrorDetails = {
        service: "OpenRouter.ai",
      };

      if (error.requestId) {
        details.request_id = error.requestId;
      }

      return buildErrorResponse(
        503,
        "AI_SERVICE_UNAVAILABLE",
        "AI service is temporarily unavailable. Please write your message manually.",
        details
      );
    }

    if (error instanceof ParseError) {
      /* eslint-disable-next-line no-console */
      console.error("Failed to parse AI response.", {
        error: error.message,
        rawPayload: error.rawPayload,
      });
      return buildErrorResponse(
        503,
        "AI_SERVICE_UNAVAILABLE",
        "AI service returned an invalid response. Please write your message manually."
      );
    }

    // Handle unexpected errors
    /* eslint-disable-next-line no-console */
    console.error("Unexpected error while generating message.", {
      error: error instanceof Error ? error.message : String(error),
      userId: user.id,
      prompt: validatedBody.prompt,
    });
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }
};
