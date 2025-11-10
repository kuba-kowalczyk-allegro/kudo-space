import { Card, CardContent, CardHeader } from "./ui/card.tsx";
import { Skeleton } from "./ui/skeleton.tsx";

export interface KudoSkeletonProps {
  count?: number;
}

/**
 * Loading placeholder for kudo cards
 * Displays skeleton UI matching the structure of KudoCard
 */
export const KudoSkeleton = ({ count = 1 }: KudoSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              {/* Sender avatar */}
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                {/* Sender name */}
                <Skeleton className="h-4 w-32" />
                {/* Recipient info */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="size-6 rounded-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Message lines */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {/* Timestamp */}
            <Skeleton className="mt-4 h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </>
  );
};
