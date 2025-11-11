import { AlertCircleIcon } from "lucide-react";
import type { FormErrorListProps } from "./types";
import type { ErrorCode } from "@/types";

/**
 * Maps error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  UNAUTHORIZED: "You must be signed in to perform this action.",
  FORBIDDEN: "You don't have permission to perform this action.",

  // Kudo Errors
  KUDO_NOT_FOUND: "The kudo you're looking for doesn't exist.",
  INVALID_UUID: "Invalid ID format.",
  INVALID_RECIPIENT: "Please select a valid recipient.",
  SELF_KUDO_NOT_ALLOWED: "You cannot give kudos to yourself. Choose a teammate to appreciate!",
  INVALID_MESSAGE: "Please provide a valid message.",
  MESSAGE_TOO_SHORT: "Your message is too short. Please write at least 1 character.",
  MESSAGE_TOO_LONG: "Your message is too long. Please keep it under 1000 characters.",

  // User Errors
  PROFILE_NOT_FOUND: "User profile not found.",

  // AI Service Errors
  INVALID_PROMPT: "Please provide a valid prompt.",
  PROMPT_TOO_SHORT: "Your prompt is too short. Please write at least 10 characters.",
  PROMPT_TOO_LONG: "Your prompt is too long. Please keep it under 200 characters.",
  AI_SERVICE_UNAVAILABLE: "AI service is currently unavailable. Please try again later.",

  // General Errors
  INVALID_PARAMETERS: "Invalid request parameters.",
  INTERNAL_ERROR: "An unexpected error occurred. Please try again.",
};

/**
 * Get user-friendly error message for a given error code
 */
function getErrorMessage(code: ErrorCode | undefined, fallbackMessage: string): string {
  if (!code) return fallbackMessage;
  return ERROR_MESSAGES[code] || fallbackMessage;
}

/**
 * FormErrorList component
 * Displays API errors with user-friendly messages
 */
export function FormErrorList({ errors }: FormErrorListProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
      <div className="flex gap-3">
        <AlertCircleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          {errors.length === 1 ? (
            <p className="text-sm text-destructive font-medium">{getErrorMessage(errors[0].code, errors[0].message)}</p>
          ) : (
            <>
              <p className="text-sm text-destructive font-medium">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive">
                    {getErrorMessage(error.code, error.message)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
