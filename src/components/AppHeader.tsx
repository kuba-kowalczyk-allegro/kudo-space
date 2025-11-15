import { ManualRefreshButton } from "./ManualRefreshButton.tsx";
import { UserMenu } from "./UserMenu.tsx";
import { Button } from "./ui/button.tsx";

export interface AppHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  userName?: string;
  userAvatar?: string | null;
  isAuthenticated?: boolean;
  onGiveKudos?: () => void;
}

/**
 * Sticky header for the kudos board
 * Displays page title, user info, and controls (refresh/give kudos/user menu)
 * Responsive: collapses buttons to icons on mobile screens
 */
export const AppHeader = ({
  onRefresh,
  isRefreshing,
  userName,
  userAvatar,
  isAuthenticated = false,
  onGiveKudos,
}: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto flex items-center justify-between px-4 py-4 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-2xl font-bold">KudoSpace</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {isAuthenticated && onGiveKudos && (
            <Button onClick={onGiveKudos} size="sm" aria-label="Give kudos">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="ml-2 hidden md:inline">Give Kudos</span>
            </Button>
          )}

          <ManualRefreshButton onClick={onRefresh} disabled={isRefreshing} />

          {isAuthenticated && userName && <UserMenu userName={userName} userAvatar={userAvatar} />}

          {!isAuthenticated && (
            <Button asChild variant="ghost" size="sm">
              <a href="/login" aria-label="Sign in">
                Sign in
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
