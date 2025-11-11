# View Implementation Plan Create Kudo Modal

## 1. Overview

The Create Kudo Modal collects recipient and message information, optionally generates copy with AI, and submits a new kudo while maintaining accessibility, validation, and integration with the board refresh workflow.

## 2. View Routing

The modal overlays the `/` route (Kudos Board) and is invoked from controls such as the header "Give Kudos" button and empty-state CTA.

## 3. Component Structure

- CreateKudoModal > Dialog (shadcn) > CreateKudoForm > {FormHeader, RecipientCombobox, MessageField, AiPromptSection, FormErrorList, FormFooter}
- RecipientCombobox > ComboboxTrigger + PopoverList (avatar, name, email entries)
- MessageField > MessageTextarea + CharacterCounter
- AiPromptSection > AiPromptToggle + AiPromptForm (prompt input, helper text, Generate button, loading indicator)
- FormFooter > SecondaryButton (cancel/close) + PrimaryButton (submit)

## 4. Component Details

### CreateKudoModal

- Component description: Wraps shadcn/ui `Dialog` to control open/close state, focus trap, and provides success callbacks to parent for board refresh.
- Main elements: `Dialog`, `DialogContent`, close icon button, slot for `CreateKudoForm`.
- Handled interactions: open/close events, ESC close, backdrop click disable (optional), onSuccess callback.
- Handled validation: none directly; relies on form child.
- Types: `KudoDTO`, `KudoViewModel` (for parent callback typing), `CreateKudoSuccessHandler` type alias.
- Props: `{ isOpen: boolean; onOpenChange: (open: boolean) => void; onSuccess: (created: KudoDTO) => void; }`.

### CreateKudoForm

- Component description: React form powered by `react-hook-form` + `zod` resolver, orchestrating recipient selection, message input, AI integration, submission, and error surfacing.
- Main elements: `Form`, `RecipientCombobox`, `MessageField`, `AiPromptSection`, `FormErrorList`, `FormFooter`.
- Handled interactions: submit, reset on close, manual message edits, AI populate, error acknowledgements.
- Handled validation: ensure recipient selected, message trimmed length 1-1000, prevent submission while loading, optional AI prompt validity gating.
- Types: `CreateKudoFormValues`, `CreateKudoCommand`, `FormErrorState`.
- Props: `{ onCancel: () => void; onSuccess: (created: KudoDTO) => void; }`.

### RecipientCombobox

- Component description: Fetches and displays selectable list of coworker profiles (excluding current user) using shadcn Combobox pattern and supports search filtering.
- Main elements: `FormField` with `ComboboxTrigger`, `PopoverContent`, list of `CommandItem` rows with avatar and contact info, empty state message.
- Handled interactions: open/close dropdown, typeahead search, option selection, retry fetch.
- Handled validation: marks field invalid if empty on submit; ensures selected option remains valid if dataset changes.
- Types: `RecipientOption`, `UserProfileDTO`.
- Props: `{ value: string | undefined; onChange: (value: string) => void; disabled: boolean; error?: string; }`.

### MessageField

- Component description: Controlled textarea with live length counter and helper copy describing expectations.
- Main elements: `Textarea`, support text, `CharacterCounter` component.
- Handled interactions: input change, paste, manual edits after AI fill.
- Handled validation: enforce trimmed length 1-1000, highlight over-limit, disable submit until valid.
- Types: none beyond `CreateKudoFormValues`.
- Props: `{ value: string; onChange: (value: string) => void; disabled: boolean; error?: string; maxLength?: number; }`.

### AiPromptSection

- Component description: Optional prompt workflow toggled via "✨ Generate with AI"; validates prompt length, calls AI endpoint, writes result into message field, and exposes error feedback via toast.
- Main elements: toggle button, `Collapse` region, prompt `Textarea`, helper text, counter (10-200 chars), primary `Generate` button with spinner, optional retry link.
- Handled interactions: toggle visibility, prompt edit, submit prompt, retry generation, cancel generation.
- Handled validation: prompt trimmed length 10-200 characters before enabling generate, disable generate while loading, handle server code mapping (`INVALID_PROMPT`, `AI_SERVICE_UNAVAILABLE`).
- Types: `GenerateMessageCommand`, `GeneratedMessageResponseDTO`, `AiPromptFormState`.
- Props: `{ onMessageGenerated: (message: string) => void; disabled: boolean; }`.

### FormErrorList

- Component description: Displays aggregated API or validation errors above footer with accessible semantics.
- Main elements: `Alert` or `Callout` component with list of messages.
- Handled interactions: none beyond close (if dismissible) or focus management.
- Handled validation: renders errors for `INVALID_RECIPIENT`, `INVALID_MESSAGE`, `MESSAGE_TOO_SHORT`, `MESSAGE_TOO_LONG`, `SELF_KUDO_NOT_ALLOWED`, generic fallback.
- Types: `ErrorState`, `ErrorCode`.
- Props: `{ errors: Array<{ message: string; code?: ErrorCode }>; }`.

### FormFooter

- Component description: Houses cancel and submit actions with status indicators.
- Main elements: `Button` variants, optional helper text describing remaining limit.
- Handled interactions: cancel triggers parent, submit handled by form.
- Handled validation: disables submit while invalid or submitting; disables cancel during submission if needed.
- Types: none.
- Props: `{ isSubmitting: boolean; isValid: boolean; onCancel: () => void; }`.

## 5. Types

`CreateKudoFormValues` extends `CreateKudoCommand` with optional `messageSource: "manual" | "ai"` metadata for analytics.
`RecipientOption` = `{ id: string; displayName: string; email?: string; avatarUrl?: string | null; searchableText: string; }` derived from `UserProfileDTO`.
`FormErrorState` = `{ fieldErrors: Partial<Record<keyof CreateKudoFormValues, string>>; formErrors: { code?: ErrorCode; message: string }[]; }`.
`AiPromptFormState` = `{ prompt: string; isOpen: boolean; }`.
`CreateKudoSuccessHandler` = `(created: KudoDTO) => void` to align with parent callbacks.
All types live in `src/types.ts` additions or `src/components/create-kudo/types.ts` module to avoid circular deps.

## 6. State Management

Use `react-hook-form` with `zodResolver` for synchronous validation and controlled fields. Local state includes `isSubmitting`, `serverErrors`, `isAiOpen`, `aiPrompt`, `isGenerating`. Integrate custom hooks: `useRecipientOptions` (React Query or SWR) for fetching `/api/users?exclude_me=true`, `useCreateKudoMutation` (wraps POST `/api/kudos`), and `useAiMessageGenerator` (wraps POST `/api/ai/generate-message`). Parent component controls modal visibility and board refetch via `onSuccess` callback.

## 7. API Integration

POST `/api/users?exclude_me=true` via GET to hydrate `RecipientOption` list; map `UserListResponseDTO.data` to options. POST `/api/kudos` uses `CreateKudoCommand` payload from form values; on `201` consume returned `KudoDTO`. POST `/api/ai/generate-message` sends `GenerateMessageCommand` with `prompt`; on success use `GeneratedMessageResponseDTO.message` to update message field and switch `messageSource` to `"ai"`. Handle specific error codes from `/api/kudos` via JSON body `ErrorResponseDTO`.

## 8. User Interactions

Opening modal focuses recipient combobox. Selecting a recipient updates form state and closes options panel. Typing message updates counter and validation state. Toggling AI section reveals prompt input; entering 10-200 chars enables Generate button. Clicking Generate calls AI endpoint, shows spinner, and on success fills message textarea (overwriting existing text after confirmation alert). Submitting form triggers mutation, disables inputs, and on success emits toast, closes modal, resets form, and calls `onSuccess`. Cancel button clears form and closes modal. Keyboard navigation supports TAB order, ESC to close, ENTER to submit when valid.

### Leave AI functionality unfinished

At this point do not integrate with ai generation endpoint. Create the UI for it, but act as if endpoint returned `AI_SERVICE_UNAVAILABLE`.

## 9. Conditions and Validation

Recipient must be non-null, valid UUID from selectable list; validation runs in zod schema and displays inline error. Message must be trimmed length between 1 and 1000 characters; character counter shows remaining and error state styling when out of bounds. AI prompt must be trimmed length 10-200 before enabling generate. Prevent submission if recipients list failed to load and no option available. Trim whitespace before submission to avoid backend `INVALID_MESSAGE`. Disable submit when `isSubmitting` or invalid to avoid duplicate posts.

## 10. Error Handling

If recipient fetch fails, show inline error with retry button and disable form until resolved. Handle `/api/kudos` error codes by mapping to user-friendly messages in `FormErrorList` and preserving user input. For `SELF_KUDO_NOT_ALLOWED`, show specific message encouraging choosing another teammate. Network or `INTERNAL_ERROR` triggers toast plus inline message. AI generation failures (`INVALID_PROMPT`, `PROMPT_TOO_SHORT`, `PROMPT_TOO_LONG`, `AI_SERVICE_UNAVAILABLE`) surface toast + helper text while keeping prompt visible for edits. Ensure closing modal resets error state. Log unexpected errors via console for debugging while showing generic UI copy.

## 11. Implementation Steps

1. Create shared types module for `CreateKudoFormValues`, `RecipientOption`, and helpers; export from appropriate folder.
2. Scaffold `CreateKudoModal` component using shadcn `Dialog` with props for state control and success callback.
3. Implement `useRecipientOptions` hook leveraging existing fetch utility; ensure exclusion of current user and memoize `RecipientOption` mapping.
4. Build `CreateKudoForm` with `react-hook-form`, zod schema (`recipient_id` UUID, `message` trimmed length 1-1000), and integrate `useCreateKudoMutation`.
5. Implement `RecipientCombobox` using shadcn `Command` components, wiring hook data, loading, empty, and error states.
6. Create `MessageField` and `CharacterCounter` to display live character usage and validation feedback.
7. Implement `AiPromptSection` with collapsible UI, local prompt state, validation (10-200), and `useAiMessageGenerator`; ensure message field updates on success.
8. Add `FormErrorList` for displaying API response errors with accessible markup.
9. Wire submission flow: on success, emit toast, reset form, call `onSuccess` to refresh board, close modal via parent.
10. Integrate modal with existing board trigger components (header CTA, empty state), ensuring focus management and cleanup on unmount.
