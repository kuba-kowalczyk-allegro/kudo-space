import { useCallback, useEffect, useRef, useState } from "react";
import type { ErrorResponseDTO, ErrorState, KudoDTO, KudoViewModel, UseInfiniteKudosState } from "../../types.ts";
import { fetchKudos } from "../../lib/services/kudos.client.ts";

const DEFAULT_LIMIT = 20;

/**
 * Format a date as a relative time string (e.g., "2 hours ago")
 */
const formatRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
};

/**
 * Map KudoDTO from API to KudoViewModel for UI consumption
 */
const mapDtoToViewModel = (dto: KudoDTO, currentUserId?: string): KudoViewModel => {
  return {
    id: dto.id,
    message: dto.message,
    createdAtISO: dto.created_at,
    createdAtRelative: formatRelativeTime(dto.created_at),
    sender: {
      id: dto.sender.id,
      displayName: dto.sender.display_name,
      avatarUrl: dto.sender.avatar_url,
      email: dto.sender.email ?? "",
    },
    recipient: {
      id: dto.recipient.id,
      displayName: dto.recipient.display_name,
      avatarUrl: dto.recipient.avatar_url,
      email: dto.recipient.email ?? "",
    },
    canDelete: currentUserId ? dto.sender_id === currentUserId : false,
  };
};

/**
 * Custom hook for infinite scroll kudos loading
 * Manages fetch lifecycle, pagination, refresh, and error handling
 */
export const useInfiniteKudos = (limit: number = DEFAULT_LIMIT, currentUserId?: string): UseInfiniteKudosState => {
  const [items, setItems] = useState<KudoViewModel[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [pagination, setPagination] = useState({
    limit,
    offset: 0,
    total: undefined as number | undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Deduplicate kudos by ID
   */
  const deduplicateKudos = useCallback((kudos: KudoViewModel[]): KudoViewModel[] => {
    const seen = new Set<string>();
    return kudos.filter((kudo) => {
      if (seen.has(kudo.id)) return false;
      seen.add(kudo.id);
      return true;
    });
  }, []);

  /**
   * Load kudos from the API
   */
  const loadKudos = useCallback(
    async (offset: number, append = false) => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetchKudos({ limit, offset });

        // Map DTOs to view models and ensure descending order
        const viewModels = response.data
          .map((dto) => mapDtoToViewModel(dto, currentUserId))
          .sort((a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime());

        setItems((prev) => {
          const combined = append ? [...prev, ...viewModels] : viewModels;
          return deduplicateKudos(combined);
        });

        setPagination({
          limit,
          offset,
          total: response.pagination.total,
        });

        setError(null);
      } catch (err) {
        // Only set error if not aborted
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const errorResponse = err as ErrorResponseDTO;
        setError({
          code: errorResponse.error.code,
          message: errorResponse.error.message,
          details: errorResponse.error.details,
        });
      }
    },
    [limit, currentUserId, deduplicateKudos]
  );

  /**
   * Load more kudos (for infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !pagination.total) return;

    const nextOffset = pagination.offset + limit;
    if (nextOffset >= pagination.total) return;

    setIsLoadingMore(true);
    await loadKudos(nextOffset, true);
    setIsLoadingMore(false);
  }, [isLoadingMore, pagination.offset, pagination.total, limit, loadKudos]);

  /**
   * Refresh kudos (reset to first page)
   */
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadKudos(0, false);
    setIsRefreshing(false);
  }, [loadKudos]);

  /**
   * Initial load on mount
   */
  useEffect(() => {
    const initialLoad = async () => {
      setIsInitialLoading(true);
      await loadKudos(0, false);
      setIsInitialLoading(false);
    };

    initialLoad();

    // Cleanup: abort any ongoing request
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadKudos]);

  const hasMore = pagination.total !== undefined && pagination.offset + items.length < pagination.total;

  return {
    items,
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    pagination,
    loadMore,
    refresh,
  };
};
