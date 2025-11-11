import { useState, useEffect } from "react";
import type { RecipientOption } from "../create-kudo/types";
import type { UserListResponseDTO, ErrorResponseDTO } from "@/types";

interface UseRecipientOptionsState {
  options: RecipientOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch and manage recipient options for the kudo form
 * Fetches users from /api/users?exclude_me=true and maps them to RecipientOption format
 */
export function useRecipientOptions(): UseRecipientOptionsState {
  const [options, setOptions] = useState<RecipientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/users?exclude_me=true", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          let errorData: ErrorResponseDTO;
          try {
            errorData = await response.json();
          } catch {
            throw new Error(`Request failed with status ${response.status}`);
          }
          throw new Error(errorData.error.message);
        }

        const data: UserListResponseDTO = await response.json();

        // Map UserProfileDTO to RecipientOption
        const mappedOptions: RecipientOption[] = data.data.map((user) => ({
          id: user.id,
          displayName: user.display_name,
          email: user.email ?? undefined,
          avatarUrl: user.avatar_url,
          searchableText: `${user.display_name} ${user.email ?? ""}`.toLowerCase(),
        }));

        setOptions(mappedOptions);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load users";
        setError(errorMessage);
        /* eslint-disable-next-line no-console */
        console.error("Error fetching recipient options:", err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUsers();
  }, [refetchTrigger]);

  return {
    options,
    isLoading,
    error,
    refetch,
  };
}
