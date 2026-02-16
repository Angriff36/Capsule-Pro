"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@repo/design-system/components/ui/sheet";
import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  BotIcon,
  CheckIcon,
  Loader2Icon,
  SendIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  executeCommand,
  type BoardCommandId,
} from "../actions/execute-command";
import type { BoardProjection } from "../types/board";

// ============================================================================
// Types
// ============================================================================

interface AiChatPanelProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectionAdded?: (projection: BoardProjection) => void;
}

// ============================================================================
// Predefined Prompts
// ============================================================================

const QUICK_PROMPTS = [
  {
    label: "What's at risk?",
    prompt: "What events or tasks are at risk this week?",
  },
  {
    label: "Summarize board",
    prompt: "Give me a summary of what's on this board.",
  },
  {
    label: "Suggest actions",
    prompt:
      "What actions should I take based on the current board state?",
  },
  {
    label: "Find conflicts",
    prompt:
      "Are there any scheduling conflicts or resource issues?",
  },
];

// ============================================================================
// AI Chat Panel Component
// ============================================================================

/**
 * AI Chat Panel — persistent side panel for conversational AI interactions
 * with the command board.
 *
 * Uses the Vercel AI SDK `useChat` hook for streaming responses from the
 * `/api/command-board/chat` route. The AI can use tools to query board
 * context and suggest board actions.
 */
export function AiChatPanel({
  boardId,
  open,
  onOpenChange,
  onProjectionAdded: _onProjectionAdded,
}: AiChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  // Track pending board action suggestions from tool calls
  const [pendingActions, setPendingActions] = useState<
    Map<string, { commandId: BoardCommandId; reason: string; status: string }>
  >(new Map());

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/command-board/chat",
      body: { boardId },
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // ---- Auto-scroll to bottom on new messages ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Focus textarea when panel opens ----
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  // ---- Show errors ----
  useEffect(() => {
    if (error) {
      console.error("[AiChatPanel] Chat error:", error);
      toast.error("AI assistant encountered an error. Please try again.");
    }
  }, [error]);

  // ---- Detect tool call parts in messages and track pending actions ----
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (isToolUIPart(part) && part.type === "tool-suggest_board_action") {
          const toolCallId = part.toolCallId;
          if (!pendingActions.has(toolCallId) && part.state === "output-available") {
            const input = part.input as {
              commandId: BoardCommandId;
              reason: string;
            };
            setPendingActions((prev) => {
              if (prev.has(toolCallId)) return prev;
              const next = new Map(prev);
              next.set(toolCallId, {
                commandId: input.commandId,
                reason: input.reason,
                status: "pending",
              });
              return next;
            });
          }
        }
      }
    }
  }, [messages, pendingActions]);

  // ---- Send a message ----
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    sendMessage({ text: trimmed });
    setInput("");
  }, [input, isLoading, sendMessage]);

  // ---- Handle keyboard shortcuts ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ---- Handle action approval ----
  const handleApproveAction = useCallback(
    async (toolCallId: string) => {
      const action = pendingActions.get(toolCallId);
      if (!action) return;

      setPendingActions((prev) => {
        const next = new Map(prev);
        next.set(toolCallId, { ...action, status: "executing" });
        return next;
      });

      try {
        const result = await executeCommand(boardId, action.commandId);
        if (result.success) {
          toast.success(result.message);
          setPendingActions((prev) => {
            const next = new Map(prev);
            next.set(toolCallId, { ...action, status: "executed" });
            return next;
          });
        } else {
          toast.error(result.error ?? "Action failed");
          setPendingActions((prev) => {
            const next = new Map(prev);
            next.set(toolCallId, { ...action, status: "failed" });
            return next;
          });
        }
      } catch (err) {
        console.error("[AiChatPanel] Action execution failed:", err);
        toast.error("Failed to execute action");
        setPendingActions((prev) => {
          const next = new Map(prev);
          next.set(toolCallId, { ...action, status: "failed" });
          return next;
        });
      }
    },
    [pendingActions, boardId]
  );

  // ---- Handle action rejection ----
  const handleRejectAction = useCallback((toolCallId: string) => {
    setPendingActions((prev) => {
      const next = new Map(prev);
      const action = next.get(toolCallId);
      if (action) {
        next.set(toolCallId, { ...action, status: "rejected" });
      }
      return next;
    });
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[400px] flex-col sm:max-w-[400px]"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <SparklesIcon className="h-4 w-4" />
            Board Assistant
          </SheetTitle>
          <SheetDescription>
            Ask questions or give commands about your board
          </SheetDescription>
        </SheetHeader>

        {/* Quick Prompts */}
        <div className="flex shrink-0 flex-wrap gap-1.5 px-1">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp.label}
              type="button"
              className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setInput(qp.prompt);
                textareaRef.current?.focus();
              }}
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-1">
          <div className="flex flex-col gap-3 py-2">
            {/* Welcome message if no messages yet */}
            {messages.length === 0 && (
              <div className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BotIcon className="h-3.5 w-3.5" />
                </div>
                <div className="flex max-w-[85%] flex-col gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                  <p className="whitespace-pre-wrap">
                    I&apos;m your board assistant. Ask me about events, tasks,
                    conflicts, or tell me to modify the board. I can add
                    entities, run commands, and highlight items for you.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {message.role === "user" ? (
                    <UserIcon className="h-3.5 w-3.5" />
                  ) : (
                    <BotIcon className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Content */}
                <div
                  className={`flex max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.parts.map((part, idx) => {
                    if (part.type === "text") {
                      return (
                        <p key={idx} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    }

                    // Handle tool parts generically
                    if (isToolUIPart(part)) {
                      const { toolCallId } = part;

                      // Board action suggestion — show approve/reject UI
                      if (part.type === "tool-suggest_board_action") {
                        const action = pendingActions.get(toolCallId);
                        if (!action) {
                          // Action not yet tracked (still streaming)
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-muted-foreground text-xs"
                            >
                              <Loader2Icon className="h-3 w-3 animate-spin" />
                              Preparing suggestion...
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-md bg-background/50 p-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-xs capitalize">
                                {action.commandId.replace(/_/g, " ")}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {action.reason}
                              </span>
                            </div>

                            {action.status === "pending" && (
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleApproveAction(toolCallId)
                                  }
                                >
                                  <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleRejectAction(toolCallId)
                                  }
                                >
                                  <XIcon className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                              </div>
                            )}

                            {action.status === "executing" && (
                              <Loader2Icon className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                            )}

                            {action.status === "executed" && (
                              <Badge
                                variant="secondary"
                                className="shrink-0 text-xs"
                              >
                                Done
                              </Badge>
                            )}

                            {action.status === "rejected" && (
                              <Badge
                                variant="outline"
                                className="shrink-0 text-muted-foreground text-xs"
                              >
                                Skipped
                              </Badge>
                            )}

                            {action.status === "failed" && (
                              <Badge
                                variant="destructive"
                                className="shrink-0 text-xs"
                              >
                                Failed
                              </Badge>
                            )}
                          </div>
                        );
                      }

                      // Other tool calls (e.g., query_board_context) — show loading
                      if (
                        part.state === "input-available" ||
                        part.state === "input-streaming"
                      ) {
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-muted-foreground text-xs"
                          >
                            <Loader2Icon className="h-3 w-3 animate-spin" />
                            Looking up board data...
                          </div>
                        );
                      }

                      // Tool output available — don't render (AI will summarize)
                      return null;
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading &&
              messages.length > 0 &&
              messages.at(-1)?.role === "user" && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <BotIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-muted-foreground text-sm">
                      Thinking...
                    </span>
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border pt-3">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your board..."
              className="min-h-[60px] resize-none"
              rows={2}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 self-end"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 text-muted-foreground text-xs">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
