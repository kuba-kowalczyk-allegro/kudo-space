import { Button } from "./ui/button.tsx";

export interface EmptyStateProps {
  message?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onGiveKudos?: () => void;
}

/**
 * Empty state component displayed when no kudos exist
 * Encourages users to add their first kudo
 */
export const EmptyState = ({
  message = "No kudos yet!",
  onRefresh,
  isRefreshing = false,
  onGiveKudos,
}: EmptyStateProps) => {
  return (
    <section
      role="status"
      className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-12 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full bg-muted p-3">
          <svg
            className="size-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">{message}</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Be the first to spread some appreciation! Create a kudo to recognize someone&apos;s awesome work.
        </p>
      </div>

      <div className="flex gap-3">
        {onGiveKudos && (
          <Button onClick={onGiveKudos} size="lg">
            Give Kudos
          </Button>
        )}

        {onRefresh && (
          <Button onClick={onRefresh} disabled={isRefreshing} variant="outline" size="lg">
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        )}
      </div>
    </section>
  );
};
