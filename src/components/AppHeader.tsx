import { ManualRefreshButton } from "./ManualRefreshButton.tsx";
import { LogoutButton } from "./LogoutButton.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.tsx";
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
 * Get initials from a name for avatar fallback
 */
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

/**
 * Sticky header for the kudos board
 * Displays page title, user info, and controls (refresh/logout)
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
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">KudoSpace</h1>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated && onGiveKudos && <Button onClick={onGiveKudos}>Give Kudos</Button>}

          <ManualRefreshButton onClick={onRefresh} disabled={isRefreshing} />

          {isAuthenticated && userName && (
            <div className="flex items-center gap-3 border-l pl-3">
              <Avatar className="size-8">
                <AvatarImage src={userAvatar ?? undefined} alt={userName} />
                <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <LogoutButton variant="ghost" size="sm" />
            </div>
          )}

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
