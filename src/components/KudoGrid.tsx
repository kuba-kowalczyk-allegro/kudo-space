import { useEffect, useRef } from "react";
import type { KudoViewModel } from "../types.ts";
import { KudoCard } from "./KudoCard.tsx";
import { KudoSkeleton } from "./KudoSkeleton.tsx";

export interface KudoGridProps {
  kudos: KudoViewModel[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onDeleteKudo: (id: string) => void;
}

/**
 * Responsive grid layout for kudos with infinite scroll support
 * Uses Intersection Observer to trigger loading more items
 */
export const KudoGrid = ({ kudos, hasMore, isLoadingMore, onLoadMore, onDeleteKudo }: KudoGridProps) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <section role="feed" aria-label="Kudos feed" data-testid="kudos-feed" className="w-full">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kudos.map((kudo) => (
          <KudoCard key={kudo.id} kudo={kudo} onDelete={onDeleteKudo} />
        ))}

        {isLoadingMore && <KudoSkeleton count={4} />}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className="h-10 w-full"
          aria-hidden="true"
          aria-label="Loading trigger for infinite scroll"
        />
      )}
    </section>
  );
};
