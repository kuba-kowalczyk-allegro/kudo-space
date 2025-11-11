import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import type { AiPromptSectionProps } from "./types";
import { Button } from "@/components/ui/button";

const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 200;

/**
 * Character counter for AI prompt
 */
function PromptCharacterCounter({ current, min, max }: { current: number; min: number; max: number }) {
  const isValid = current >= min && current <= max;
  const isOverLimit = current > max;

  return (
    <span
      className={`text-xs tabular-nums ${
        isOverLimit ? "text-destructive font-medium" : isValid ? "text-success font-medium" : "text-muted-foreground"
      }`}
    >
      {current} / {max}
    </span>
  );
}

/**
 * AI Prompt Section component
 * Provides UI for generating kudo messages using AI
 * Currently shows AI_SERVICE_UNAVAILABLE error as the endpoint is not ready
 */
export function AiPromptSection({
  onMessageGenerated, // eslint-disable-line @typescript-eslint/no-unused-vars
  disabled,
}: AiPromptSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedPrompt = prompt.trim();
  const isPromptValid = trimmedPrompt.length >= MIN_PROMPT_LENGTH && trimmedPrompt.length <= MAX_PROMPT_LENGTH;

  const handleGenerate = async () => {
    if (!isPromptValid) return;

    setIsGenerating(true);
    setError(null);

    // Simulate AI service unavailable error as specified in requirements
    setTimeout(() => {
      setError("AI service is currently unavailable. Please try again later or write your message manually.");
      setIsGenerating(false);
    }, 500);

    // TODO: Implement actual AI generation when endpoint is ready
    // try {
    //   const response = await fetch("/api/ai/generate-message", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ prompt: trimmedPrompt }),
    //   });
    //
    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.error.message);
    //   }
    //
    //   const data = await response.json();
    //   onMessageGenerated(data.message);
    //   setPrompt("");
    //   setIsOpen(false);
    // } catch (err) {
    //   setError(err instanceof Error ? err.message : "Failed to generate message");
    // } finally {
    //   setIsGenerating(false);
    // }
  };

  return (
    <div className="space-y-3">
      {/* Toggle Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="gap-2"
      >
        <SparklesIcon className="size-4" />
        {isOpen ? "Hide AI Assistant" : "Generate with AI"}
      </Button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="space-y-3 rounded-lg border border-input bg-muted/30 p-4">
          <div className="space-y-2">
            <label htmlFor="ai-prompt" className="text-sm font-medium">
              AI Prompt
            </label>
            <p className="text-xs text-muted-foreground">
              Describe what you&apos;d like to appreciate about your colleague, and AI will help craft a thoughtful
              message.
            </p>
            <textarea
              id="ai-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating || disabled}
              rows={3}
              maxLength={MAX_PROMPT_LENGTH}
              placeholder="e.g., helped me debug a critical issue, stayed late to complete the project..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {trimmedPrompt.length < MIN_PROMPT_LENGTH
                  ? `At least ${MIN_PROMPT_LENGTH} characters required`
                  : "Ready to generate"}
              </span>
              <PromptCharacterCounter current={trimmedPrompt.length} min={MIN_PROMPT_LENGTH} max={MAX_PROMPT_LENGTH} />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                setPrompt("");
                setError(null);
              }}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerate}
              disabled={!isPromptValid || isGenerating || disabled}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="size-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
