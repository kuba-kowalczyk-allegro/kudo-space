import { z } from "zod";

/**
 * Validation schema for creating a new kudo
 * Enforces:
 * - recipient_id must be a valid UUID
 * - message must be trimmed and between 1-1000 characters
 */
export const createKudoSchema = z.object({
  recipient_id: z
    .string()
    .uuid({ message: "Please select a valid recipient" })
    .min(1, { message: "Recipient is required" }),
  message: z
    .string()
    .min(1, { message: "Message is required" })
    .max(1000, { message: "Message must be 1000 characters or less" })
    .transform((val) => val.trim())
    .refine((val) => val.length >= 1, {
      message: "Message cannot be empty or only whitespace",
    }),
});

export type CreateKudoSchemaType = z.infer<typeof createKudoSchema>;
