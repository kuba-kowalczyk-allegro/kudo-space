import type { MessageFieldProps } from "./types";

/**
 * Character counter component
 * Shows current character count and maximum limit with visual feedback
 */
function CharacterCounter({ current, max }: { current: number; max: number }) {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage >= 90;
  const isOverLimit = current > max;

  return (
    <span
      className={`text-xs tabular-nums ${
        isOverLimit
          ? "text-destructive font-medium"
          : isNearLimit
            ? "text-warning font-medium"
            : "text-muted-foreground"
      }`}
      aria-live="polite"
    >
      {current} / {max}
    </span>
  );
}

/**
 * Message field component with live character counter
 * Provides real-time validation feedback and character limit enforcement
 */
export function MessageField({ value, onChange, disabled, error, maxLength = 1000 }: MessageFieldProps) {
  const currentLength = value.length;
  const isOverLimit = currentLength > maxLength;

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          id="message"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
          maxLength={maxLength}
          placeholder="Share your appreciation..."
          aria-describedby="message-helper message-counter"
          aria-invalid={!!error || isOverLimit}
          className={`w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${
            error || isOverLimit ? "border-destructive" : "border-input"
          } bg-background`}
        />
      </div>

      <div className="flex justify-between gap-2 text-xs">
        <span id="message-helper" className={error ? "text-destructive" : "text-muted-foreground"}>
          {error || "Write a thoughtful message (1-1000 characters)"}
        </span>
        <CharacterCounter current={currentLength} max={maxLength} />
      </div>
    </div>
  );
}
