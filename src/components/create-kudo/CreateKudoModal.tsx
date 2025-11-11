import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { CreateKudoModalProps } from "./types";
import { CreateKudoForm } from "./CreateKudoForm";

/**
 * Modal dialog for creating a new kudo
 * Wraps the CreateKudoForm in a shadcn Dialog component
 *
 * Manages modal state, focus trap, and coordinates success callbacks
 * to refresh the parent board view.
 */
export function CreateKudoModal({ isOpen, onOpenChange, onSuccess }: CreateKudoModalProps) {
  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSuccess = (created: Parameters<typeof onSuccess>[0]) => {
    onSuccess(created);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" aria-describedby="create-kudo-description">
        <DialogHeader>
          <DialogTitle>Give Kudos</DialogTitle>
          <DialogDescription id="create-kudo-description">
            Show appreciation for a teammate&apos;s great work
          </DialogDescription>
        </DialogHeader>

        <CreateKudoForm onCancel={handleCancel} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
