# OpenRouter Service Implementation Guide

## 1. Service Description
- **Component 1 – Configuration Manager:** Centralizes OpenRouter API base URL, model defaults, timeout, and retry policies. Ensures consistency and simplifies environment overrides.
  - *Functionality:* Loads `OPENROUTER_API_KEY`, default `model`, optional `response_format`, temperature, max tokens, and request timeout from `import.meta.env` with runtime validation. Supplies typed configuration to the service.
  - *Challenges:* (1) Missing or malformed env vars. (2) Divergent defaults between environments.
  - *Solutions:* 1. Validate via Zod in constructor; throw `ConfigurationError` early. 2. Provide single config source with per-env overrides using Astro `import.meta.env` and document required `.env` entries.
- **Component 2 – Message Builder:** Normalizes system and user prompts into OpenRouter-compatible payload segments.
  - *Functionality:* Accepts business-level inputs (kudo metadata, tone, length) and produces `messages` array with `{ role, content }` entries, including optional assistant exemplars.
  - *Challenges:* (1) Ensuring language neutrality and injection safety. (2) Keeping prompts consistent across calls.
  - *Solutions:* 1. Escape dynamic inputs and enforce length caps before interpolation. 2. Store base templates as immutable constants or localized files.
- **Component 3 – Payload Composer:** Augments messages with model selection, parameters, and structured response directives.
  - *Functionality:* Builds final JSON body containing `model`, `messages`, `response_format`, and `transforms` like `max_completion_tokens`, `temperature`, `top_p`.
  - *Challenges:* (1) Synchronizing schema with response parser. (2) Handling optional parameters cleanly.
  - *Solutions:* 1. Co-locate JSON schema definition with parser and generate TypeScript types via `zod`. 2. Use helper to merge defaults with per-request overrides.
- **Component 4 – HTTP Client Wrapper:** Handles authenticated calls to `https://openrouter.ai/api/v1/chat/completions` with standardized headers (`HTTP-Referer`, `X-Title`).
  - *Functionality:* Uses `fetch` (Astro server runtime) to POST payload, injects API key, and enforces timeout/retry logic via `AbortController`.
  - *Challenges:* (1) Managing retries without duplicate charges. (2) Detecting transient vs permanent errors.
  - *Solutions:* 1. Retry only idempotent network failures; skip on HTTP 4xx. 2. Map status codes to error taxonomy and expose metadata for observability.
- **Component 5 – Response Parser:** Validates JSON response, extracts structured payload, and maps to domain DTO (e.g., `{ message, summary, metadata }`).
  - *Functionality:* Deserializes response, applies `zod` schema derived from `response_format`, and returns typed result.
  - *Challenges:* (1) Schema drift between request and response. (2) Handling partial completions or tool calls.
  - *Solutions:* 1. Reuse single schema definition for both request and parsing. 2. Guard for `choices[0]?.message?.content` presence; raise `ParseError` with raw snippet when missing.
- **Component 6 – Telemetry & Logging:** Captures success/failure metrics and contextual logs without leaking PII.
  - *Functionality:* Emits structured logs (duration, tokens, model) and integrates with existing observability hooks.
  - *Challenges:* (1) Avoid logging sensitive message content. (2) Balancing verbosity and performance.
  - *Solutions:* 1. Redact user-entered text, log only hash or length. 2. Batch telemetry and use lazy evaluation for expensive computations.

### OpenRouter Payload Elements
1. **System message:** Provide base instructions, e.g., `{ role: 'system', content: 'You are an assistant that crafts concise kudos messages with positive tone.' }`. Build via Message Builder using immutable template constants.
2. **User message:** Inject runtime context, e.g., `{ role: 'user', content: 'Recipient: Alex; Highlight: led the release; Tone: celebratory; Length: short.' }` with sanitized inputs.
3. **Structured response (`response_format`):**
   ```ts
   const responseFormat = {
     type: 'json_schema',
     json_schema: {
       name: 'kudo_completion',
       strict: true,
       schema: {
         type: 'object',
         required: ['message', 'suggested_hashtags'],
         properties: {
           message: { type: 'string', minLength: 10, maxLength: 320 },
           suggested_hashtags: {
             type: 'array',
             items: { type: 'string', pattern: '^#[a-z0-9_]{2,30}$' },
             maxItems: 3
           }
         }
       }
     }
   } as const;
   ```
   Add via Payload Composer so parser can validate with identical schema.
4. **Model name:** Centralize default (e.g., `'openrouter/gpt-4o-mini'`) in Configuration Manager; expose override parameter per request when experimentation is needed.
5. **Model parameters:** Support `temperature`, `top_p`, `max_completion_tokens`, `presence_penalty`. Example merge pattern:
   ```ts
   const params = { temperature: 0.8, top_p: 0.9, max_completion_tokens: 256, presence_penalty: 0.2 };
   ```
   Merge user overrides with defaults before request dispatch.

## 2. Constructor Description
- Accepts a typed config object `{ apiKey, apiUrl, defaultModel, requestOptions }`.
- Performs Zod validation against required fields (`apiKey`, `defaultModel`).
- Initializes immutable references for `responseFormat`, message templates, and logger integration.
- Optionally allows dependency injection for HTTP client and clock to aid testing.

## 3. Public Methods and Fields
- `completeKudoMessage(input: CompleteKudoMessageInput, overrides?: CompletionOverrides): Promise<CompleteKudoMessageResult>`
  - Builds system/user messages, merges overrides, calls OpenRouter, returns parsed domain DTO.
- `withOverrides(overrides: ServiceOverrides): OpenRouterService`
  - Returns new instance sharing base config but replacing partial dependencies (e.g., logger, timeout) for scoped use (tests or experiments).
- `readonly responseSchema: z.ZodType<CompleteKudoMessageResult>`
  - Exposes schema to other layers (e.g., validation in API route) ensuring consistent contract.

## 4. Private Methods and Fields
- `buildMessages(input): ChatMessage[]` — constructs system/user conversation, trims and sanitizes inputs.
- `composePayload(messages, overrides): OpenRouterRequestPayload` — merges model, params, and `response_format`.
- `executeRequest(payload): Promise<RawOpenRouterResponse>` — wraps `fetch` with timeout, retries, and logging.
- `parseResponse(raw): CompleteKudoMessageResult` — validates via Zod; throws `ParseError` on mismatch.
- `handleError(error, context): never` — normalizes errors into domain-specific classes (`ConfigurationError`, `NetworkError`, `RateLimitError`, `ServiceUnavailableError`, `ParseError`).
- Private fields: `_config`, `_httpClient` (default `globalThis.fetch`), `_logger`, `_responseSchema`.

## 5. Error Handling
1. **Missing configuration:** No API key or model defined. Throw `ConfigurationError` with remediation hint.
2. **Network failure/timeouts:** Connection issues or exceeded timeout. Retry (configurable) and surface `NetworkError` including request ID if available.
3. **HTTP 4xx responses:** Handle 401/403 (authentication), 429 (rate limit), 422 (schema mismatch) separately with specific error classes and optional backoff guidance.
4. **HTTP 5xx responses:** Retry with exponential backoff (respecting idempotency); if still failing, throw `ServiceUnavailableError` holding status and correlation ID.
5. **Invalid JSON/Schema violations:** When response cannot be parsed or does not match `response_format`, throw `ParseError` including truncated payload for debugging.
6. **Business validation errors:** Input exceeds allowed length or missing required fields. Reject before API call with `ValidationError`.

## 6. Security Considerations
- Store API key solely in server-side environment variables; never expose to client bundles.
- Redact sensitive user input in logs; log hashes/lengths instead of raw message content.
- Enforce strict HTTPS endpoint (`https://openrouter.ai`) and validate TLS errors.
- Limit retries to avoid duplicated prompts; include unique request IDs to detect replay.
- Monitor token usage; implement quotas to prevent abuse.
- Keep response schema strict to avoid prompt injection returning unexpected fields.

## 7. Step-by-Step Implementation Plan
1. **Set up configuration:**
   - Define `OPENROUTER_API_KEY`, `OPENROUTER_API_URL`, `OPENROUTER_DEFAULT_MODEL`, `OPENROUTER_TIMEOUT_MS` in `.env` and update `import.meta.env` types.
   - Implement Zod schema in `src/lib/validation/openrouter.ts` for runtime checks.
2. **Scaffold service file:**
   - Create `src/lib/services/openrouter.service.ts` exporting `OpenRouterService` class.
   - Define DTOs (`CompleteKudoMessageInput`, `CompleteKudoMessageResult`, `CompletionOverrides`).
3. **Implement constructor:**
   - Validate config, assign private fields, freeze response schema constant built via Zod mirroring JSON schema used in `response_format`.
4. **Implement message builder:**
   - Add private templates for system instructions and optional assistant exemplars.
   - Write `_buildMessages` to sanitize inputs (trim, limit length, escape newlines) and return `ChatMessage[]`.
5. **Define response schema & format:**
   - Build `responseFormat` constant matching Zod schema. Export schema for reuse in API routes.
6. **Compose payload:**
   - Implement `_composePayload` merging defaults and overrides for model parameters and optional response schema toggles.
   - Ensure headers include `Authorization: Bearer ${apiKey}`, `HTTP-Referer`, `X-Title`.
7. **HTTP execution layer:**
   - Implement `_executeRequest` using `fetch` with `AbortController` for timeout.
   - Add retry helper for 408/429/5xx with exponential backoff and jitter; respect retry limit.
8. **Parse and map response:**
   - Use Zod to validate `choices[0].message.content` parsed as JSON; map to domain DTO.
   - Capture token usage from `usage` field for telemetry.
9. **Public API implementation:**
   - `completeKudoMessage` orchestrates steps: validate input, build messages, compose payload, execute, parse, log summary, return result.
10. **Error normalization:**
    - Centralize in `_handleError` with switch on error type/status; include safe context metadata (model, requestId).
11. **Testing:**
    - Add unit tests for message builder, payload composer, parser using mocked fetch (Vitest).
    - Provide integration test hitting mocked OpenRouter server ensuring schema compatibility.
12. **Integration:**
    - Inject service into `create-kudo` flow (e.g., in `useCreateKudoMutation`) replacing placeholder AI generator.
    - Document usage in README or developer docs.
