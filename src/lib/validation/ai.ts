import { z } from "zod";

/**
 * Validation schema for AI prompt input
 * Used in POST /api/ai/generate-message endpoint
 */
export const generateMessageBodySchema = z.object({
  prompt: z
    .string({ invalid_type_error: "prompt must be a string" })
    .trim()
    .min(10, { message: "prompt must be at least 10 characters" })
    .max(200, { message: "prompt must be at most 200 characters" }),
});

export type GenerateMessageBody = z.infer<typeof generateMessageBodySchema>;
