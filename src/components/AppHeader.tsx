import { ManualRefreshButton } from "./ManualRefreshButton.tsx";

export interface AppHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  userName?: string;
}

/**
 * Sticky header for the kudos board
 * Displays page title and refresh control
 */
export const AppHeader = ({ onRefresh, isRefreshing, userName }: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">KudoSpace</h1>
          {userName && <span className="text-muted-foreground text-sm hidden sm:inline">Welcome, {userName}</span>}
        </div>

        <div className="flex items-center gap-3">
          <ManualRefreshButton onClick={onRefresh} disabled={isRefreshing} />
        </div>
      </div>
    </header>
  );
};
