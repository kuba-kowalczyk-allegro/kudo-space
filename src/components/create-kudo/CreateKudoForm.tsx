import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { CreateKudoFormProps, CreateKudoFormValues } from "./types";
import { createKudoSchema } from "@/lib/validation/create-kudo";
import { useCreateKudoMutation } from "@/components/hooks/useCreateKudoMutation";
import { useRecipientOptions } from "@/components/hooks/useRecipientOptions";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { RecipientCombobox } from "./RecipientCombobox";
import { MessageField } from "./MessageField";
import { AiPromptSection } from "./AiPromptSection";
import { FormErrorList } from "./FormErrorList";
import type { ErrorResponseDTO } from "@/types";

/**
 * Form component for creating a new kudo
 * Uses react-hook-form with zod validation
 * Integrates RecipientCombobox, MessageField, and AI prompt section
 */
export function CreateKudoForm({ onCancel, onSuccess }: CreateKudoFormProps) {
  const {
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    reset,
  } = useForm<CreateKudoFormValues>({
    resolver: zodResolver(createKudoSchema),
    mode: "onChange",
    defaultValues: {
      recipient_id: "",
      message: "",
    },
  });

  const { mutate, isLoading: isSubmitting } = useCreateKudoMutation();
  const {
    options: recipients,
    isLoading: isLoadingRecipients,
    error: recipientsError,
    refetch,
  } = useRecipientOptions();
  const [formErrors, setFormErrors] = useState<ErrorResponseDTO | null>(null);

  const recipientId = watch("recipient_id");
  const message = watch("message");

  const onSubmit = async (data: CreateKudoFormValues) => {
    setFormErrors(null);
    try {
      const result = await mutate(data);

      // Show success toast
      toast.success("Kudos sent successfully!");

      // Reset form
      reset();

      // Call success callback to close modal and refresh board
      onSuccess(result);
    } catch (error) {
      if (error && typeof error === "object" && "error" in error) {
        setFormErrors(error as ErrorResponseDTO);

        // Show error toast
        toast.error("Failed to send kudos. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Recipient Selection */}
      <div className="space-y-2">
        <label htmlFor="recipient_id" className="text-sm font-medium">
          Recipient *
        </label>
        <RecipientCombobox
          value={recipientId}
          onChange={(id) => setValue("recipient_id", id, { shouldValidate: true })}
          disabled={isSubmitting}
          error={errors.recipient_id?.message}
          options={recipients}
          isLoading={isLoadingRecipients}
          errorMessage={recipientsError}
          onRetry={refetch}
        />
      </div>

      {/* Message Field */}
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium">
          Message *
        </label>
        <MessageField
          value={message}
          onChange={(value) => setValue("message", value, { shouldValidate: true })}
          disabled={isSubmitting}
          error={errors.message?.message}
          maxLength={1000}
        />
      </div>

      {/* AI Prompt Section */}
      <AiPromptSection
        onMessageGenerated={(generatedMessage) => setValue("message", generatedMessage, { shouldValidate: true })}
        disabled={isSubmitting}
      />

      {/* Form Errors */}
      <FormErrorList errors={formErrors ? [{ code: formErrors.error.code, message: formErrors.error.message }] : []} />

      {/* Form Footer */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid || isLoadingRecipients}>
          {isSubmitting ? "Creating..." : "Give Kudos"}
        </Button>
      </div>
    </form>
  );
}
