import { useCallback, useState } from "react";
import { useInfiniteKudos } from "./hooks/useInfiniteKudos.ts";
import { useDeleteKudoMutation } from "./hooks/useDeleteKudoMutation.ts";
import { AppHeader } from "./AppHeader.tsx";
import { EmptyState } from "./EmptyState.tsx";
import { KudoGrid } from "./KudoGrid.tsx";
import { KudoSkeleton } from "./KudoSkeleton.tsx";
import { CreateKudoModal } from "./create-kudo/index.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog.tsx";
import { toast } from "@/lib/toast.ts";
import type { KudoDTO } from "../types.ts";

export interface KudosBoardProps {
  currentUserId?: string;
  userName?: string;
  userAvatar?: string | null;
  isAuthenticated?: boolean;
}

/**
 * Root component for the kudos board view
 * Orchestrates data fetching, state management, and rendering of all child components
 */
export const KudosBoard = ({ currentUserId, userName, userAvatar, isAuthenticated }: KudosBoardProps) => {
  const { items, isInitialLoading, isLoadingMore, isRefreshing, error, hasMore, loadMore, refresh } = useInfiniteKudos(
    30,
    currentUserId
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; kudoId: string | null }>({
    isOpen: false,
    kudoId: null,
  });

  const { mutate: deleteKudoMutate, isLoading: isDeletingKudo } = useDeleteKudoMutation();

  const handleDeleteKudo = useCallback((id: string) => {
    setDeleteConfirmation({ isOpen: true, kudoId: id });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmation.kudoId) return;

    try {
      await deleteKudoMutate(deleteConfirmation.kudoId);
      toast.success("Kudo deleted successfully");
      // Refresh the board to remove the deleted kudo
      refresh();
    } catch {
      // Error handling is already done in the mutation hook
      // Show user-friendly error message
      toast.error("Failed to delete kudo. Please try again.");
    } finally {
      setDeleteConfirmation({ isOpen: false, kudoId: null });
    }
  }, [deleteConfirmation.kudoId, deleteKudoMutate, refresh]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmation({ isOpen: false, kudoId: null });
  }, []);

  const handleGiveKudos = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const handleCreateKudoSuccess = useCallback(
    (created: KudoDTO) => {
      // Log success for debugging
      /* eslint-disable-next-line no-console */
      console.log("Kudo created successfully:", created);

      // Refresh the board to show the new kudo
      refresh();
    },
    [refresh]
  );

  // Show error banner if there's an error
  const errorBanner = error && (
    <div role="alert" className="mx-auto mb-6 max-w-4xl rounded-lg border border-destructive bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <svg className="size-5 text-destructive shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="font-semibold text-destructive">Error loading kudos</h3>
          <p className="text-sm text-destructive/90 mt-1">{error.message}</p>
          {error.code && <p className="text-xs text-muted-foreground mt-1">Error code: {error.code}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        userName={userName}
        userAvatar={userAvatar}
        isAuthenticated={isAuthenticated}
        onGiveKudos={isAuthenticated ? handleGiveKudos : undefined}
      />

      <main className="container mx-auto flex-1 px-4 py-8">
        {errorBanner}

        {isInitialLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KudoSkeleton count={8} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            onRefresh={refresh}
            isRefreshing={isRefreshing}
            onGiveKudos={isAuthenticated ? handleGiveKudos : undefined}
          />
        ) : (
          <KudoGrid
            kudos={items}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
            onDeleteKudo={handleDeleteKudo}
          />
        )}
      </main>

      {/* Create Kudo Modal */}
      {isAuthenticated && (
        <CreateKudoModal
          isOpen={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSuccess={handleCreateKudoSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Kudo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this kudo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={isDeletingKudo}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeletingKudo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingKudo ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
