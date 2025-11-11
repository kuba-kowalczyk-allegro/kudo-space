import type { CreateKudoCommand, ErrorCode, KudoDTO } from "@/types";

/**
 * Form values for creating a new kudo
 */
export type CreateKudoFormValues = CreateKudoCommand;

/**
 * Recipient option for the combobox selector
 * Derived from UserProfileDTO with additional searchable text field
 */
export interface RecipientOption {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  /**
   * Combined searchable text for filtering (name + email)
   */
  searchableText: string;
}

/**
 * Form error state structure
 * Separates field-level errors from form-level API errors
 */
export interface FormErrorState {
  /**
   * Field-specific validation errors
   */
  fieldErrors: Partial<Record<keyof CreateKudoFormValues, string>>;
  /**
   * Form-level errors from API responses
   */
  formErrors: {
    code?: ErrorCode;
    message: string;
  }[];
}

/**
 * AI prompt form state for controlling the prompt section
 */
export interface AiPromptFormState {
  prompt: string;
  isOpen: boolean;
}

/**
 * Success handler callback type
 * Called when a kudo is successfully created
 */
export type CreateKudoSuccessHandler = (created: KudoDTO) => void;

/**
 * Props for CreateKudoModal component
 */
export interface CreateKudoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: CreateKudoSuccessHandler;
}

/**
 * Props for CreateKudoForm component
 */
export interface CreateKudoFormProps {
  onCancel: () => void;
  onSuccess: CreateKudoSuccessHandler;
}

/**
 * Props for RecipientCombobox component
 */
export interface RecipientComboboxProps {
  value: string | undefined;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
}

/**
 * Props for MessageField component
 */
export interface MessageFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
  maxLength?: number;
}

/**
 * Props for AiPromptSection component
 */
export interface AiPromptSectionProps {
  onMessageGenerated: (message: string) => void;
  disabled: boolean;
}

/**
 * Props for FormErrorList component
 */
export interface FormErrorListProps {
  errors: {
    message: string;
    code?: ErrorCode;
  }[];
}

/**
 * Props for FormFooter component
 */
export interface FormFooterProps {
  isSubmitting: boolean;
  isValid: boolean;
  onCancel: () => void;
}
