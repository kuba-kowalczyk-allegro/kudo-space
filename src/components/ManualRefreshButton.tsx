import { Button } from "./ui/button.tsx";

export interface ManualRefreshButtonProps {
  onClick: () => void;
  disabled: boolean;
}

/**
 * Accessible refresh button with loading state indicator
 * Shows spinner icon when disabled/loading
 * On mobile (< md), shows only the icon; on desktop, shows icon + text
 */
export const ManualRefreshButton = ({ onClick, disabled }: ManualRefreshButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outline"
      size="sm"
      aria-label={disabled ? "Refreshing kudos" : "Refresh kudos"}
    >
      <svg
        className={`size-4 ${disabled ? "animate-spin" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span className="ml-2 hidden md:inline">{disabled ? "Refreshing..." : "Refresh"}</span>
    </Button>
  );
};
