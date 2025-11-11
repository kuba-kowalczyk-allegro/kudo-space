import { z } from "zod";

/**
 * Schema for validating UUID path parameters
 * Used in DELETE /api/kudos/{id} endpoint
 */
export const kudoIdPathSchema = z.object({
  id: z.string().uuid({ message: "id must be a valid UUID" }),
});

export type KudoIdPath = z.infer<typeof kudoIdPathSchema>;
