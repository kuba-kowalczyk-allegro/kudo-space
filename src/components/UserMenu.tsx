import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.tsx";
import { Button } from "./ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";
import { LogoutButton } from "./LogoutButton.tsx";

export interface UserMenuProps {
  userName: string;
  userAvatar?: string | null;
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
 * User menu component with avatar and dropdown for user actions
 * Contains user info and logout option
 */
export const UserMenu = ({ userName, userAvatar }: UserMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="flex size-9 items-center justify-center rounded-full border border-border transition-none hover:bg-accent"
          aria-label="Open user menu"
        >
          <Avatar className="size-8">
            <AvatarImage src={userAvatar ?? undefined} alt={userName} />
            <AvatarFallback className="text-xs">{getInitials(userName)}</AvatarFallback>
          </Avatar>
          <span className="sr-only">{`Profile menu for ${userName}`}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <LogoutButton variant="ghost" size="sm" className="w-full justify-start" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
