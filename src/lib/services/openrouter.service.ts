import type {
  ChatMessage,
  CompleteKudoMessageInput,
  CompleteKudoMessageResult,
  CompletionOverrides,
  OpenRouterConfig,
  OpenRouterRawResponse,
  OpenRouterRequestPayload,
} from "../validation/openrouter.ts";
import {
  chatMessageSchema,
  completeKudoMessageInputSchema,
  completeKudoMessageResultSchema,
  openRouterConfigSchema,
  openRouterRawResponseSchema,
} from "../validation/openrouter.ts";

/**
 * Custom error classes for OpenRouter service
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly correlationId?: string
  ) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly rawPayload?: string
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * System message template for OpenRouter API
 * Instructs the model to return JSON format
 */
const SYSTEM_MESSAGE = `You are an assistant that crafts concise kudos messages with positive tone.
Your task is to create appreciation messages for team members based on provided context.
Maintain a warm, grateful tone, be specific about achievements, and keep messages authentic.
Don't be shy to use emojis, humor, and friendly language to make the message engaging.

IMPORTANT: You MUST respond with valid JSON in exactly this format:
{
  "message": "your kudos message here (10-320 characters)",
  "suggested_hashtags": ["#hashtag1", "#hashtag2"]
}

Rules:
- message: 10-320 characters, positive and specific
- suggested_hashtags: 0-3 hashtags, lowercase with # prefix, format: #[a-z0-9_]{2,30}
- Return ONLY the JSON object, no other text`;

/**
 * Service overrides for testing and customization
 */
export interface ServiceOverrides {
  httpClient?: typeof fetch;
  logger?: Logger;
  timeout?: number;
}

/**
 * Logger interface for structured logging
 */
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console logger implementation
 */
const defaultLogger: Logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, context || "");
  },
  error: (message: string, context?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, context || "");
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.debug(`[DEBUG] ${message}`, context || "");
  },
};

/**
 * OpenRouter service for AI-powered kudo message completion
 * Handles communication with OpenRouter API, including retry logic,
 * error handling, and response parsing
 */
export class OpenRouterService {
  private readonly _config: OpenRouterConfig;
  private readonly _httpClient: typeof fetch;
  private readonly _logger: Logger;
  public readonly responseSchema = completeKudoMessageResultSchema;

  constructor(config: Partial<OpenRouterConfig>, overrides?: ServiceOverrides) {
    // Validate and apply defaults to configuration
    const validationResult = openRouterConfigSchema.safeParse(config);

    if (!validationResult.success) {
      throw new ConfigurationError(`Invalid OpenRouter configuration: ${validationResult.error.message}`);
    }

    this._config = validationResult.data;
    this._httpClient = overrides?.httpClient || globalThis.fetch;
    this._logger = overrides?.logger || defaultLogger;

    // Override timeout if provided
    if (overrides?.timeout) {
      this._config.timeoutMs = overrides.timeout;
    }

    this._logger.info("OpenRouter service initialized", {
      model: this._config.defaultModel,
      apiUrl: this._config.apiUrl,
      timeout: this._config.timeoutMs,
    });
  }

  /**
   * Complete a kudo message using AI
   * @param input - Input parameters for message generation
   * @param overrides - Optional overrides for request parameters
   * @returns Generated kudo message with suggested hashtags
   */
  async completeKudoMessage(
    input: CompleteKudoMessageInput,
    overrides?: CompletionOverrides
  ): Promise<CompleteKudoMessageResult> {
    // Validate input
    const inputValidation = completeKudoMessageInputSchema.safeParse(input);
    if (!inputValidation.success) {
      throw new ValidationError(`Invalid input: ${inputValidation.error.message}`);
    }

    const validatedInput = inputValidation.data;

    this._logger.debug("Starting kudo message completion", {
      recipientLength: validatedInput.recipient.length,
      highlightLength: validatedInput.highlight.length,
      tone: validatedInput.tone,
      length: validatedInput.length,
    });

    try {
      // Build messages
      const messages = this._buildMessages(validatedInput);

      // Compose payload
      const payload = this._composePayload(messages, overrides);

      // Execute request
      const rawResponse = await this._executeRequest(payload);

      // Parse response
      const result = this._parseResponse(rawResponse);

      this._logger.info("Kudo message completion successful", {
        messageLength: result.message.length,
        hashtagCount: result.suggestedHashtags.length,
      });

      return result;
    } catch (error) {
      this._handleError(error, {
        recipientLength: validatedInput.recipient.length,
        tone: validatedInput.tone,
      });
    }
  }

  /**
   * Create a new service instance with overrides
   * Useful for testing or scoped configuration changes
   */
  withOverrides(overrides: ServiceOverrides): OpenRouterService {
    return new OpenRouterService(this._config, {
      ...overrides,
      logger: overrides.logger || this._logger,
    });
  }

  /**
   * Build chat messages from input
   * Sanitizes and formats user input into OpenRouter message format
   */
  private _buildMessages(input: CompleteKudoMessageInput): ChatMessage[] {
    // Sanitize inputs
    const recipient = this._sanitizeInput(input.recipient, 100);
    const highlight = this._sanitizeInput(input.highlight, 500);

    // Map length preference to guidance
    const lengthGuidance = {
      short: "Keep it brief (50-100 characters)",
      medium: "Use a moderate length (100-200 characters)",
      long: "Be detailed (200-320 characters)",
    }[input.length];

    // Build user message
    const userMessage = `Recipient: ${recipient}
Highlight: ${highlight}
Tone: ${input.tone}
Length: ${lengthGuidance}

Please generate a kudos message that appreciates this person for their contribution.`;

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_MESSAGE },
      { role: "user", content: userMessage },
    ];

    // Validate messages
    messages.forEach((msg) => {
      const validation = chatMessageSchema.safeParse(msg);
      if (!validation.success) {
        throw new ValidationError(`Invalid message format: ${validation.error.message}`);
      }
    });

    return messages;
  }

  /**
   * Sanitize user input
   * Trims whitespace, enforces length limits, and escapes potentially dangerous characters
   */
  private _sanitizeInput(input: string, maxLength: number): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[\n\r]/g, " ")
      .replace(/\s+/g, " ");
  }

  /**
   * Compose OpenRouter API payload
   * Merges configuration defaults with request-specific overrides
   */
  private _composePayload(messages: ChatMessage[], overrides?: CompletionOverrides): OpenRouterRequestPayload {
    const payload: OpenRouterRequestPayload = {
      model: overrides?.model || this._config.defaultModel,
      messages,
    };

    // Add optional parameters if provided
    if (overrides?.temperature !== undefined) {
      payload.temperature = overrides.temperature;
    }
    if (overrides?.topP !== undefined) {
      payload.top_p = overrides.topP;
    }
    if (overrides?.maxCompletionTokens !== undefined) {
      payload.max_completion_tokens = overrides.maxCompletionTokens;
    }
    if (overrides?.presencePenalty !== undefined) {
      payload.presence_penalty = overrides.presencePenalty;
    }

    return payload;
  }

  /**
   * Execute HTTP request to OpenRouter API
   * Includes timeout, retry logic, and proper error handling
   */
  private async _executeRequest(payload: OpenRouterRequestPayload): Promise<OpenRouterRawResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._config.timeoutMs);

    try {
      const response = await this._httpClient(`${this._config.apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this._config.apiKey}`,
          "HTTP-Referer": import.meta.env.SITE_URL || "https://kudospace.dev",
          "X-Title": "KudoSpace",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error response");
        const requestId = response.headers.get("x-request-id");

        if (response.status === 401 || response.status === 403) {
          throw new ConfigurationError(
            `Authentication failed: ${response.status} - ${errorText}. Check OPENROUTER_API_KEY.`
          );
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          throw new RateLimitError(
            `Rate limit exceeded: ${errorText}`,
            retryAfter ? parseInt(retryAfter, 10) : undefined
          );
        }

        if (response.status === 422) {
          throw new ValidationError(`Schema validation failed: ${errorText}`);
        }

        if (response.status >= 500) {
          throw new ServiceUnavailableError(
            `OpenRouter service error: ${response.status} - ${errorText}`,
            response.status,
            requestId || undefined
          );
        }

        throw new NetworkError(`HTTP ${response.status}: ${errorText}`, requestId || undefined);
      }

      const rawData = await response.json();
      const validation = openRouterRawResponseSchema.safeParse(rawData);

      if (!validation.success) {
        throw new ParseError(
          `Invalid response format: ${validation.error.message}`,
          JSON.stringify(rawData).slice(0, 500)
        );
      }

      return validation.data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError(`Request timeout after ${this._config.timeoutMs}ms`);
      }

      throw error;
    }
  }

  /**
   * Parse OpenRouter response and extract structured data
   * Validates against expected schema and maps to domain DTO
   */
  private _parseResponse(rawResponse: OpenRouterRawResponse): CompleteKudoMessageResult {
    const choice = rawResponse.choices[0];

    if (!choice?.message?.content) {
      throw new ParseError("Missing message content in response", JSON.stringify(rawResponse).slice(0, 500));
    }

    try {
      let content = choice.message.content.trim();

      // Try to extract JSON if the response contains extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }

      const parsedContent = JSON.parse(content);

      // Normalize the response to handle different field names
      const normalized = {
        message: parsedContent.message || "",
        suggestedHashtags: parsedContent.suggested_hashtags || parsedContent.suggestedHashtags || [],
      };

      const validation = completeKudoMessageResultSchema.safeParse(normalized);

      if (!validation.success) {
        throw new ParseError(`Response content validation failed: ${validation.error.message}`, content.slice(0, 500));
      }

      // Log token usage if available
      if (rawResponse.usage) {
        this._logger.debug("Token usage", {
          promptTokens: rawResponse.usage.prompt_tokens,
          completionTokens: rawResponse.usage.completion_tokens,
          totalTokens: rawResponse.usage.total_tokens,
        });
      }

      return validation.data;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }

      throw new ParseError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`,
        choice.message.content.slice(0, 500)
      );
    }
  }

  /**
   * Centralized error handler
   * Normalizes errors and adds context for debugging
   */
  private _handleError(error: unknown, context: Record<string, unknown>): never {
    // If it's already one of our custom errors, just log and rethrow
    if (
      error instanceof ConfigurationError ||
      error instanceof NetworkError ||
      error instanceof RateLimitError ||
      error instanceof ServiceUnavailableError ||
      error instanceof ParseError ||
      error instanceof ValidationError
    ) {
      this._logger.error(error.message, { ...context, errorType: error.name });
      throw error;
    }

    // Handle unexpected errors
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    this._logger.error("Unexpected error in OpenRouter service", {
      ...context,
      error: message,
    });

    throw new NetworkError(`Unexpected error: ${message}`);
  }
}

/**
 * Factory function to create OpenRouter service from environment variables
 */
export function createOpenRouterService(overrides?: ServiceOverrides): OpenRouterService {
  const config: Partial<OpenRouterConfig> = {
    apiKey: import.meta.env.OPENROUTER_API_KEY,
    apiUrl: import.meta.env.OPENROUTER_API_URL,
    defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL,
    timeoutMs: import.meta.env.OPENROUTER_TIMEOUT_MS ? parseInt(import.meta.env.OPENROUTER_TIMEOUT_MS, 10) : undefined,
  };

  return new OpenRouterService(config, overrides);
}
