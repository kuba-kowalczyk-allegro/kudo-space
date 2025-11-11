import { useState } from "react";
import type { CreateKudoCommand, KudoDTO, ErrorResponseDTO } from "@/types";

interface UseCreateKudoMutationResult {
  mutate: (data: CreateKudoCommand) => Promise<KudoDTO>;
  isLoading: boolean;
  error: ErrorResponseDTO | null;
  reset: () => void;
}

/**
 * Hook to create a new kudo
 * Handles POST /api/kudos with loading, error states, and response parsing
 */
export function useCreateKudoMutation(): UseCreateKudoMutationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponseDTO | null>(null);

  const reset = () => {
    setError(null);
  };

  const mutate = async (data: CreateKudoCommand): Promise<KudoDTO> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kudos", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorData: ErrorResponseDTO;
        try {
          errorData = await response.json();
        } catch {
          throw {
            error: {
              code: "INTERNAL_ERROR",
              message: `Request failed with status ${response.status}`,
            },
          } as ErrorResponseDTO;
        }
        setError(errorData);
        throw errorData;
      }

      const result: KudoDTO = await response.json();
      return result;
    } catch (err) {
      if (err && typeof err === "object" && "error" in err) {
        throw err;
      }
      const fallbackError: ErrorResponseDTO = {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to create kudo",
        },
      };
      setError(fallbackError);
      throw fallbackError;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mutate,
    isLoading,
    error,
    reset,
  };
}
