import { z } from "zod";

/**
 * Configuration schema for OpenRouter service
 * Validates required and optional environment variables
 */
export const openRouterConfigSchema = z.object({
  apiKey: z.string().min(1, "OPENROUTER_API_KEY is required"),
  apiUrl: z.string().url("OPENROUTER_API_URL must be a valid URL").default("https://openrouter.ai/api/v1"),
  defaultModel: z.string().default("meta-llama/llama-3.3-70b-instruct:free"),
  timeoutMs: z.number().int().positive().default(30000),
});

export type OpenRouterConfig = z.infer<typeof openRouterConfigSchema>;

/**
 * Request options schema for individual requests
 */
export const completionOverridesSchema = z
  .object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    maxCompletionTokens: z.number().int().positive().optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
  })
  .optional();

export type CompletionOverrides = z.infer<typeof completionOverridesSchema>;

/**
 * Input schema for kudo message completion
 */
export const completeKudoMessageInputSchema = z.object({
  recipient: z.string().min(1, "Recipient is required").max(100),
  highlight: z.string().min(1, "Highlight is required").max(500),
  tone: z.enum(["celebratory", "grateful", "supportive", "professional"]).default("grateful"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
});

export type CompleteKudoMessageInput = z.infer<typeof completeKudoMessageInputSchema>;

/**
 * Response schema for kudo message completion
 * Matches the JSON schema used in OpenRouter response_format
 */
export const completeKudoMessageResultSchema = z.object({
  message: z.string().min(10).max(320),
  suggestedHashtags: z
    .array(z.string().regex(/^#[a-z0-9_]{2,30}$/i, "Invalid hashtag format"))
    .max(3)
    .default([]),
});

export type CompleteKudoMessageResult = z.infer<typeof completeKudoMessageResultSchema>;

/**
 * Chat message schema for OpenRouter API
 */
export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * OpenRouter request payload schema
 */
export const openRouterRequestPayloadSchema = z.object({
  model: z.string(),
  messages: z.array(chatMessageSchema),
  response_format: z
    .object({
      type: z.literal("json_schema"),
      json_schema: z.object({
        name: z.string(),
        strict: z.boolean(),
        schema: z.record(z.any()),
      }),
    })
    .optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_completion_tokens: z.number().optional(),
  presence_penalty: z.number().optional(),
});

export type OpenRouterRequestPayload = z.infer<typeof openRouterRequestPayloadSchema>;

/**
 * OpenRouter raw response schema
 */
export const openRouterRawResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string(),
      }),
      finish_reason: z.string(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});

export type OpenRouterRawResponse = z.infer<typeof openRouterRawResponseSchema>;
