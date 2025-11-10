import type { KudoViewModel } from "../types.ts";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.tsx";
import { Button } from "./ui/button.tsx";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card.tsx";

export interface KudoCardProps {
  kudo: KudoViewModel;
  onDelete: (id: string) => void;
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
 * Kudo card component displaying sender, recipient, message, and actions
 * Uses shadcn card, avatar, and button components
 */
export const KudoCard = ({ kudo, onDelete }: KudoCardProps) => {
  return (
    <Card>
      <article aria-label={`Kudo from ${kudo.sender.displayName} to ${kudo.recipient.displayName}`}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Avatar className="size-10">
              <AvatarImage src={kudo.sender.avatarUrl ?? undefined} alt={kudo.sender.displayName} />
              <AvatarFallback>{getInitials(kudo.sender.displayName)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{kudo.sender.displayName}</span>
                <span className="text-muted-foreground text-xs">gave kudos to</span>
                <Avatar className="size-6">
                  <AvatarImage src={kudo.recipient.avatarUrl ?? undefined} alt={kudo.recipient.displayName} />
                  <AvatarFallback className="text-xs">{getInitials(kudo.recipient.displayName)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm">{kudo.recipient.displayName}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm whitespace-pre-wrap break-words">{kudo.message}</p>
        </CardContent>

        <CardFooter className="justify-between items-center">
          <time dateTime={kudo.createdAtISO} className="text-muted-foreground text-xs">
            {kudo.createdAtRelative}
          </time>

          {kudo.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(kudo.id)}
              aria-label={`Delete kudo from ${kudo.sender.displayName}`}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="sr-only">Delete</span>
            </Button>
          )}
        </CardFooter>
      </article>
    </Card>
  );
};
