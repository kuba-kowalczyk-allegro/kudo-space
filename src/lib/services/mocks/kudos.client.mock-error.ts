// Temporary mock for testing error handling
// Replace fetchKudos import in useInfiniteKudos.ts with:
// import { fetchKudos } from "../../lib/services/mocks/kudos.client.mock-error.ts";

import type { ErrorResponseDTO, KudoListResponseDTO } from "../../../types.ts";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const fetchKudos = async (p0: { limit: number; offset: number }): Promise<KudoListResponseDTO> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Throw an error to simulate API failure
  throw {
    error: {
      code: "INTERNAL_ERROR",
      message: "Failed to connect to the database. Please try again later.",
      details: {
        retryable: true,
        timestamp: new Date().toISOString(),
      },
    },
  } as ErrorResponseDTO;
};
