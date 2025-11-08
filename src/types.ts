import type { Tables, TablesInsert } from "./db/database.types";

// ============================================================================
// Base Entity Types (from Database)
// ============================================================================

/**
 * Profile entity from the database
 */
export type ProfileEntity = Tables<"profiles">;

/**
 * Kudo entity from the database
 */
export type KudoEntity = Tables<"kudos">;

/**
 * Insert type for creating a new kudo
 */
export type KudoInsert = TablesInsert<"kudos">;

// ============================================================================
// User DTOs
// ============================================================================

/**
 * Basic user profile information used in API responses
 * Derived from the profiles table
 */
export type UserProfileDTO = Pick<ProfileEntity, "id" | "display_name" | "avatar_url" | "email">;

/**
 * Extended user profile with timestamps for the current authenticated user
 * Used in GET /api/users/me endpoint
 */
export type CurrentUserProfileDTO = ProfileEntity;

/**
 * Response DTO for listing users
 * Used in GET /api/users endpoint
 */
export interface UserListResponseDTO {
  data: UserProfileDTO[];
}

// ============================================================================
// Kudo DTOs
// ============================================================================

/**
 * Complete kudo information with nested sender and recipient data
 * Used in all kudo response endpoints
 */
export interface KudoDTO {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
  updated_at: string;
  sender: UserProfileDTO;
  recipient: UserProfileDTO;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationDTO {
  limit: number;
  offset: number;
  total: number;
}

/**
 * Response DTO for listing kudos with pagination
 * Used in GET /api/kudos endpoint
 */
export interface KudoListResponseDTO {
  data: KudoDTO[];
  pagination: PaginationDTO;
}

/**
 * Response DTO for successful kudo deletion
 * Used in DELETE /api/kudos/{id} endpoint
 */
export interface DeleteKudoResponseDTO {
  message: string;
  id: string;
}

// ============================================================================
// Command Models (Request Bodies)
// ============================================================================

/**
 * Command for creating a new kudo
 * Used in POST /api/kudos endpoint
 * sender_id is automatically set from the authenticated user context
 */
export type CreateKudoCommand = Pick<KudoInsert, "recipient_id" | "message">;

/**
 * Command for generating a kudo message using AI
 * Used in POST /api/ai/generate-message endpoint
 */
export interface GenerateMessageCommand {
  prompt: string;
}

/**
 * Response DTO for AI-generated kudo message
 * Used in POST /api/ai/generate-message endpoint
 */
export interface GeneratedMessageResponseDTO {
  message: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * All possible error codes returned by the API
 */
export type ErrorCode =
  // Authentication & Authorization
  | "UNAUTHORIZED"
  | "FORBIDDEN"

  // Kudo Errors
  | "KUDO_NOT_FOUND"
  | "INVALID_UUID"
  | "INVALID_RECIPIENT"
  | "SELF_KUDO_NOT_ALLOWED"
  | "INVALID_MESSAGE"
  | "MESSAGE_TOO_SHORT"
  | "MESSAGE_TOO_LONG"

  // User Errors
  | "PROFILE_NOT_FOUND"

  // AI Service Errors
  | "INVALID_PROMPT"
  | "PROMPT_TOO_SHORT"
  | "PROMPT_TOO_LONG"
  | "AI_SERVICE_UNAVAILABLE"

  // General Errors
  | "INVALID_PARAMETERS"
  | "INTERNAL_ERROR";

/**
 * Error details object with additional context
 */
export type ErrorDetails = Record<string, string | number | boolean | null | undefined>;

/**
 * Standardized error response structure
 * Used in all API error responses
 */
export interface ErrorResponseDTO {
  error: {
    message: string;
    code: ErrorCode;
    details?: ErrorDetails;
  };
}
