"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { XIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface TagInputProps {
  disabled?: boolean;
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  value: string[];
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag…",
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableSuggestions = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(input.toLowerCase())
  );

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInput("");
      setShowSuggestions(false);
    },
    [value, onChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((t) => t !== tag));
    },
    [value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      const lastTag = value.at(-1);
      if (lastTag) {
        removeTag(lastTag);
      }
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {value.map((tag) => (
          <Badge className="gap-1 pr-1" key={tag} variant="secondary">
            {tag}
            <button
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              type="button"
            >
              <XIcon className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          className="min-w-[80px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
          disabled={disabled}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          ref={inputRef}
          value={input}
        />
      </div>
      {showSuggestions && availableSuggestions.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
          {availableSuggestions.slice(0, 8).map((suggestion) => (
            <button
              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              key={suggestion}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(suggestion);
              }}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
