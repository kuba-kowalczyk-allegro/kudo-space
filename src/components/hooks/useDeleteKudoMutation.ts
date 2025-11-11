import { useState } from "react";
import type { DeleteKudoResponseDTO, ErrorResponseDTO } from "@/types";
import { deleteKudo } from "@/lib/services/kudos.client";

interface UseDeleteKudoMutationResult {
  mutate: (id: string) => Promise<DeleteKudoResponseDTO>;
  isLoading: boolean;
  error: ErrorResponseDTO | null;
  reset: () => void;
}

/**
 * Hook to delete a kudo
 * Handles DELETE /api/kudos/{id} with loading, error states, and response parsing
 */
export function useDeleteKudoMutation(): UseDeleteKudoMutationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorResponseDTO | null>(null);

  const reset = () => {
    setError(null);
  };

  const mutate = async (id: string): Promise<DeleteKudoResponseDTO> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteKudo(id);
      return result;
    } catch (err) {
      if (err && typeof err === "object" && "error" in err) {
        const errorData = err as ErrorResponseDTO;
        setError(errorData);
        throw errorData;
      }
      const fallbackError: ErrorResponseDTO = {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to delete kudo",
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
