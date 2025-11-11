import type { DeleteKudoResponseDTO, ErrorResponseDTO, FetchKudosParams, KudoListResponseDTO } from "../../types.ts";

/**
 * Fetch kudos from the API with pagination
 * @param params - Pagination parameters (limit and offset)
 * @returns Promise resolving to KudoListResponseDTO
 * @throws ErrorResponseDTO on API errors or network failures
 */
export const fetchKudos = async (params: FetchKudosParams = {}): Promise<KudoListResponseDTO> => {
  const { limit, offset } = params;
  const searchParams = new URLSearchParams();

  if (limit !== undefined) {
    searchParams.set("limit", limit.toString());
  }
  if (offset !== undefined) {
    searchParams.set("offset", offset.toString());
  }

  const url = `/api/kudos${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Parse error response
      let errorData: ErrorResponseDTO;
      try {
        errorData = await response.json();
      } catch {
        // If parsing fails, create a generic error
        throw {
          error: {
            code: "INTERNAL_ERROR",
            message: `Request failed with status ${response.status}`,
          },
        } as ErrorResponseDTO;
      }
      throw errorData;
    }

    const data: KudoListResponseDTO = await response.json();
    return data;
  } catch (error) {
    // If it's already an ErrorResponseDTO, rethrow it
    if (
      error &&
      typeof error === "object" &&
      "error" in error &&
      error.error &&
      typeof error.error === "object" &&
      "code" in error.error &&
      "message" in error.error
    ) {
      throw error as ErrorResponseDTO;
    }

    // Handle network errors
    throw {
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch kudos",
      },
    } as ErrorResponseDTO;
  }
};

/**
 * Delete a kudo by ID
 * @param id - The ID of the kudo to delete
 * @returns Promise resolving to DeleteKudoResponseDTO
 * @throws ErrorResponseDTO on API errors or network failures
 */
export const deleteKudo = async (id: string): Promise<DeleteKudoResponseDTO> => {
  const url = `/api/kudos/${id}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Parse error response
      let errorData: ErrorResponseDTO;
      try {
        errorData = await response.json();
      } catch {
        // If parsing fails, create a generic error
        throw {
          error: {
            code: "INTERNAL_ERROR",
            message: `Request failed with status ${response.status}`,
          },
        } as ErrorResponseDTO;
      }
      throw errorData;
    }

    const data: DeleteKudoResponseDTO = await response.json();
    return data;
  } catch (error) {
    // If it's already an ErrorResponseDTO, rethrow it
    if (
      error &&
      typeof error === "object" &&
      "error" in error &&
      error.error &&
      typeof error.error === "object" &&
      "code" in error.error &&
      "message" in error.error
    ) {
      throw error as ErrorResponseDTO;
    }

    // Handle network errors
    throw {
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Failed to delete kudo",
      },
    } as ErrorResponseDTO;
  }
};
