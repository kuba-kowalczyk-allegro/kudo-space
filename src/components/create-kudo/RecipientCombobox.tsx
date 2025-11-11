import { useState, useMemo } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import type { RecipientComboboxProps } from "./types";
import type { RecipientOption } from "./types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface RecipientComboboxInternalProps extends RecipientComboboxProps {
  options: RecipientOption[];
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

/**
 * Combobox for selecting a kudo recipient
 * Displays user avatars, names, and emails with typeahead search using shadcn Command/Popover
 */
export function RecipientCombobox({
  value,
  onChange,
  disabled,
  error,
  options,
  isLoading,
  errorMessage,
  onRetry,
}: RecipientComboboxInternalProps) {
  const [open, setOpen] = useState(false);

  // Get selected option for display
  const selectedOption = useMemo(() => {
    return options.find((option) => option.id === value);
  }, [options, value]);

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
        Loading recipients...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-2">
        <div className="w-full rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
        No recipients available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select recipient"
            disabled={disabled}
            className={cn("w-full justify-between", !value && "text-muted-foreground")}
          >
            {selectedOption ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar className="size-6">
                  <AvatarImage src={selectedOption.avatarUrl ?? undefined} alt={selectedOption.displayName} />
                  <AvatarFallback className="text-xs">{getInitials(selectedOption.displayName)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{selectedOption.displayName}</span>
              </div>
            ) : (
              "Select recipient..."
            )}
            <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search recipients..." />
            <CommandList>
              <CommandEmpty>No recipient found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.searchableText}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="size-8">
                        <AvatarImage src={option.avatarUrl ?? undefined} alt={option.displayName} />
                        <AvatarFallback>{getInitials(option.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{option.displayName}</div>
                        {option.email && <div className="text-xs text-muted-foreground truncate">{option.email}</div>}
                      </div>
                    </div>
                    <CheckIcon
                      className={cn("ml-2 size-4 shrink-0", value === option.id ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Error Message */}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
