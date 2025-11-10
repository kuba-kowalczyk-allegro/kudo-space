// Temporary mock for testing empty state
// Replace fetchKudos import in useInfiniteKudos.ts with:
// import { fetchKudos } from "../../lib/services/mocks/kudos.client.mock-empty.ts";

import type { KudoListResponseDTO } from "../../../types.ts";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const fetchKudos = async (p0: { limit: number; offset: number }): Promise<KudoListResponseDTO> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Return empty response
  return {
    data: [],
    pagination: {
      limit: 10,
      offset: 0,
      total: 0,
    },
  };
};
