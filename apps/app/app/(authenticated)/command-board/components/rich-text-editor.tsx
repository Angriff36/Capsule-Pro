"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Bold, Code, Italic, List, ListOrdered, Minus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Mention } from "../types/board";

// ============================================================================
// Types
// ============================================================================

interface RichTextEditorProps {
  value: string;
  onChange: (value: string, mentions: Mention[]) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
  mentionSuggestions?: MentionSuggestion[];
  onMentionSelect?: (mention: Mention) => void;
}

interface MentionSuggestion {
  userId: string;
  userName: string;
  avatar?: string | null;
}

interface ToolbarAction {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  isActive?: boolean;
}

// ============================================================================
// Rich Text Format Helpers
// ============================================================================

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  const selected = text.substring(start, end);
  const replacement = `${before}${selected}${after}`;

  textarea.value = text.substring(0, start) + replacement + text.substring(end);

  // Restore focus and move cursor after insertion
  textarea.focus();
  textarea.setSelectionRange(start + before.length, end + before.length);

  // Trigger change event
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

// ============================================================================
// Rich Text Editor Component
// ============================================================================

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type @ to mention someone...",
  minHeight = "80px",
  disabled = false,
  mentionSuggestions = [],
  onMentionSelect,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string>("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Filter mentions based on query
  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return [];
    return mentionSuggestions.filter((m) =>
      m.userName.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [mentionQuery, mentionSuggestions]);

  // Handle text input and detect @mentions
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      const newValue = textarea.value;
      const cursorPosition = textarea.selectionStart;

      // Check for @mention trigger
      const textBeforeCursor = newValue.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      // Show mentions if:
      // 1. @ was found recently (within 20 chars)
      // 2. No space after the @
      // 3. Either no suggestions or matching suggestions
      if (
        lastAtIndex !== -1 &&
        cursorPosition - lastAtIndex <= 20 &&
        !textBeforeCursor.substring(lastAtIndex + 1).includes(" ")
      ) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        setMentionQuery(query);
        setMentionIndex(0);
        setShowMentions(true);
        setCursorPosition(lastAtIndex);
      } else {
        setShowMentions(false);
        setMentionQuery("");
      }

      // Extract all mentions from current value
      const mentionRegex = /@(\w+)/g;
      const mentions: Mention[] = [];
      let match;

      while ((match = mentionRegex.exec(newValue)) !== null) {
        const userId = match[1]; // In real impl, look up user ID
        mentions.push({
          userId,
          userName: match[1],
          position: match.index,
        });
      }

      onChange(newValue, mentions);
    },
    [onChange, mentionSuggestions]
  );

  // Handle mention selection
  const selectMention = useCallback(
    (mention: MentionSuggestion) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Replace @query with @username
      const before = value.substring(0, cursorPosition);
      const after = value.substring(textarea.selectionStart);
      const newValue = `${before}@${mention.userName} ${after}`;

      // Extract existing mentions from the new value
      const existingMentions: Mention[] = [];
      let match;
      const mentionRegex = /@(\w+)/g;
      while ((match = mentionRegex.exec(newValue)) !== null) {
        existingMentions.push({
          userId: match[1],
          userName: match[1],
          position: match.index,
        });
      }

      onChange(newValue, existingMentions);

      // Move cursor after mention
      textarea.focus();
      const newPosition = cursorPosition + mention.userName.length + 2; // +2 for @ and space
      textarea.setSelectionRange(newPosition, newPosition);

      setShowMentions(false);
      setMentionQuery("");
      onMentionSelect?.({
        userId: mention.userId,
        userName: mention.userName,
        position: cursorPosition,
      });
    },
    [cursorPosition, value, onChange, onMentionSelect]
  );

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showMentions || filteredMentions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setMentionIndex((i) => (i + 1) % filteredMentions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setMentionIndex(
            (i) => (i - 1 + filteredMentions.length) % filteredMentions.length
          );
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (filteredMentions[mentionIndex]) {
            selectMention(filteredMentions[mentionIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowMentions(false);
          break;
      }
    },
    [showMentions, filteredMentions, mentionIndex, selectMention]
  );

  // Toolbar actions
  const toolbarActions: ToolbarAction[] = useMemo(
    () => [
      {
        icon: <Bold className="size-4" />,
        label: "Bold",
        action: () =>
          textareaRef.current && wrapSelection(textareaRef.current, "**"),
      },
      {
        icon: <Italic className="size-4" />,
        label: "Italic",
        action: () =>
          textareaRef.current && wrapSelection(textareaRef.current, "_"),
      },
      {
        icon: <Code className="size-4" />,
        label: "Code",
        action: () =>
          textareaRef.current && wrapSelection(textareaRef.current, "`"),
      },
      {
        icon: <Minus className="size-4" />,
        label: "Strikethrough",
        action: () =>
          textareaRef.current && wrapSelection(textareaRef.current, "~~"),
      },
      {
        icon: <List className="size-4" />,
        label: "Bullet List",
        action: () => {
          const textarea = textareaRef.current;
          if (!textarea) return;
          const start = textarea.selectionStart;
          const before = textarea.value.substring(0, start);
          const after = textarea.value.substring(start);
          textarea.value = `${before}\n- ${after}`;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.focus();
        },
      },
      {
        icon: <ListOrdered className="size-4" />,
        label: "Numbered List",
        action: () => {
          const textarea = textareaRef.current;
          if (!textarea) return;
          const start = textarea.selectionStart;
          const before = textarea.value.substring(0, start);
          const after = textarea.value.substring(start);
          textarea.value = `${before}\n1. ${after}`;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.focus();
        },
      },
    ],
    []
  );

  return (
    <div className="relative">
      {/* Toolbar */}
      {!disabled && (
        <div className="mb-1.5 flex flex-wrap gap-0.5 border-b border-border/50 pb-1.5">
          {toolbarActions.map((action, i) => (
            <Button
              className={`h-6 w-6 p-0 ${
                action.isActive ? "bg-muted" : "hover:bg-muted"
              }`}
              disabled={disabled}
              key={i}
              onClick={action.action}
              size="icon-sm"
              title={action.label}
              type="button"
              variant="ghost"
            >
              {action.icon}
            </Button>
          ))}
        </div>
      )}

      {/* Textarea with mention popover */}
      <Popover open={showMentions && filteredMentions.length > 0}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Textarea
              className="min-h-[100px] resize-none"
              disabled={disabled}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              ref={textareaRef}
              style={{ minHeight }}
              value={value}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="z-50 w-60 p-1" side="top">
          {filteredMentions.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No users found
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {filteredMentions.map((mention, i) => (
                <button
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    i === mentionIndex ? "bg-accent" : "hover:bg-muted"
                  }`}
                  key={mention.userId}
                  onClick={() => selectMention(mention)}
                  type="button"
                >
                  {mention.avatar ? (
                    <img
                      alt={mention.userName}
                      className="size-5 rounded-full"
                      src={mention.avatar}
                    />
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                      {mention.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{mention.userName}</span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Helper text */}
      <div className="mt-1 text-[10px] text-muted-foreground">
        Markdown supported. Type @ to mention users.
      </div>
    </div>
  );
}

// ============================================================================
// Rich Text Preview Component
// ============================================================================

interface RichTextPreviewProps {
  content: string;
  mentions?: Mention[];
  className?: string;
}

export function RichTextPreview({
  content,
  mentions = [],
  className = "",
}: RichTextPreviewProps) {
  const renderedContent = useMemo(() => {
    let rendered = content;

    // Escape HTML first
    rendered = rendered
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Apply markdown-like formatting
    rendered = rendered
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/_(.+?)_/g, "<em>$1</em>")
      // Strikethrough
      .replace(/~~(.+?)~~/g, "<del>$1</del>")
      // Code inline
      .replace(
        /`(.+?)`/g,
        "<code class='bg-muted px-1 py-0.5 rounded text-xs'>$1</code>"
      )
      // Line breaks
      .replace(/\n/g, "<br>");

    // Replace mentions with styled spans
    mentions.forEach((mention) => {
      const mentionRegex = new RegExp(`@${mention.userName}`, "g");
      rendered = rendered.replace(
        mentionRegex,
        `<span class="mention">@${mention.userName}</span>`
      );
    });

    return rendered;
  }, [content, mentions]);

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
