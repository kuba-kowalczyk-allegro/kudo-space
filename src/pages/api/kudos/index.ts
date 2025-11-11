import type { APIRoute } from "astro";
import { z } from "zod";

import type { SupabaseClient } from "../../../db/supabase.client.ts";
import { createKudo, CreateKudoServiceError, listKudos } from "../../../lib/services/kudos.service.ts";
import type { CreateKudoCommand, ErrorCode, ErrorDetails, ErrorResponseDTO } from "../../../types.ts";

export const prerender = false;

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const MIN_MESSAGE_LENGTH = 1;
const MAX_MESSAGE_LENGTH = 1000;

interface RequestLocals {
  supabase?: SupabaseClient;
  user?: { id: string };
}

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

const createKudoBodySchema = z.object({
  recipient_id: z
    .string({ invalid_type_error: "recipient_id must be a string" })
    .uuid({ message: "recipient_id must be a valid UUID" }),
  message: z
    .string({ invalid_type_error: "message must be a string" })
    .trim()
    .min(MIN_MESSAGE_LENGTH, { message: `message must be at least ${MIN_MESSAGE_LENGTH} character(s)` })
    .max(MAX_MESSAGE_LENGTH, { message: `message must be at most ${MAX_MESSAGE_LENGTH} characters` }),
});

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

export const POST: APIRoute = async ({ locals, request }) => {
  const { supabase, user } = locals as RequestLocals;

  if (!user) {
    return buildErrorResponse(401, "UNAUTHORIZED", "Authentication required.");
  }

  if (!supabase) {
    /* eslint-disable-next-line no-console */
    console.error("Supabase client missing from request context.");
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return buildErrorResponse(400, "INVALID_PARAMETERS", "Request body must be valid JSON.");
  }

  let command: CreateKudoCommand;
  try {
    command = createKudoBodySchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const detailsEntries = error.issues.map((issue) => [issue.path.join(".") || "body", issue.message] as const);
      const details: ErrorDetails = Object.fromEntries(detailsEntries);

      const messageIssue = error.issues.find((issue) => issue.path[0] === "message");
      if (messageIssue) {
        if (messageIssue.code === "too_small") {
          return buildErrorResponse(400, "MESSAGE_TOO_SHORT", messageIssue.message, details);
        }
        if (messageIssue.code === "too_big") {
          return buildErrorResponse(400, "MESSAGE_TOO_LONG", messageIssue.message, details);
        }
        return buildErrorResponse(400, "INVALID_MESSAGE", messageIssue.message, details);
      }

      const recipientIssue = error.issues.find((issue) => issue.path[0] === "recipient_id");
      if (recipientIssue) {
        return buildErrorResponse(400, "INVALID_RECIPIENT", recipientIssue.message, details);
      }

      return buildErrorResponse(400, "INVALID_PARAMETERS", "Invalid request body.", details);
    }

    /* eslint-disable-next-line no-console */
    console.error("Unexpected error while validating create kudo payload.", error);
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }

  if (command.recipient_id === user.id) {
    return buildErrorResponse(400, "SELF_KUDO_NOT_ALLOWED", "You cannot send kudos to yourself.");
  }

  try {
    const createdKudo = await createKudo(supabase, {
      senderId: user.id,
      recipientId: command.recipient_id,
      message: command.message,
    });

    return Response.json(createdKudo, { status: 201 });
  } catch (error) {
    if (error instanceof CreateKudoServiceError) {
      return buildErrorResponse(error.status, error.code, error.message, error.details);
    }

    /* eslint-disable-next-line no-console */
    console.error("Failed to create kudo.", {
      error,
      senderId: user.id,
      recipientId: command.recipient_id,
    });
    return buildErrorResponse(500, "INTERNAL_ERROR", "Unexpected error occurred.");
  }
};
