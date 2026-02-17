"use client";

import { useChat } from "@ai-sdk/react";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { DefaultChatTransport, isToolUIPart } from "ai";
import {
  BotIcon,
  CheckIcon,
  Loader2Icon,
  SendIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type BoardCommandId,
  executeCommand,
} from "../actions/execute-command";
import { approveManifestPlan } from "../actions/manifest-plans";
import type { BoardProjection } from "../types/board";
import type { SuggestedManifestPlan } from "../types/manifest-plan";

// ============================================================================
// Types
// ============================================================================

interface AiChatPanelProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectionAdded?: (projection: BoardProjection) => void;
  onPreviewPlanChange?: (plan: SuggestedManifestPlan | null) => void;
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
    prompt: "What actions should I take based on the current board state?",
  },
  {
    label: "Find conflicts",
    prompt: "Are there any scheduling conflicts or resource issues?",
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
  onPreviewPlanChange,
}: AiChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  // Track pending board action suggestions from tool calls
  const [pendingActions, setPendingActions] = useState<
    Map<string, { commandId: BoardCommandId; reason: string; status: string }>
  >(new Map());
  const [pendingPlans, setPendingPlans] = useState<
    Map<
      string,
      {
        plan: SuggestedManifestPlan;
        answers: Record<string, string>;
        status: "pending" | "executing" | "executed" | "rejected" | "failed";
        resultSummary?: string;
        error?: string;
      }
    >
  >(new Map());
  const [previewPlanToolCallId, setPreviewPlanToolCallId] = useState<
    string | null
  >(null);

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
  }, []);

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
      if (message.role !== "assistant") {
        continue;
      }
      for (const part of message.parts) {
        if (isToolUIPart(part) && part.type === "tool-suggest_board_action") {
          const toolCallId = part.toolCallId;
          if (
            !pendingActions.has(toolCallId) &&
            part.state === "output-available"
          ) {
            const input = part.input as {
              commandId: BoardCommandId;
              reason: string;
            };
            setPendingActions((prev) => {
              if (prev.has(toolCallId)) {
                return prev;
              }
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

        if (isToolUIPart(part) && part.type === "tool-suggest_manifest_plan") {
          const toolCallId = part.toolCallId;
          if (
            !pendingPlans.has(toolCallId) &&
            part.state === "output-available" &&
            part.output
          ) {
            const output = part.output as {
              suggested?: boolean;
              plan?: SuggestedManifestPlan;
            };
            const suggestedPlan = output.plan;
            if (output.suggested && suggestedPlan) {
              setPendingPlans((prev) => {
                if (prev.has(toolCallId)) {
                  return prev;
                }
                const next = new Map(prev);
                next.set(toolCallId, {
                  plan: suggestedPlan,
                  answers: {},
                  status: "pending",
                });
                return next;
              });
            }
          }
        }
      }
    }
  }, [messages, pendingActions, pendingPlans]);

  // ---- Send a message ----
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

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
      if (!action) {
        return;
      }

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

  const handlePlanAnswerChange = useCallback(
    (toolCallId: string, questionId: string, value: string) => {
      setPendingPlans((prev) => {
        const current = prev.get(toolCallId);
        if (!current) {
          return prev;
        }

        const next = new Map(prev);
        next.set(toolCallId, {
          ...current,
          answers: {
            ...current.answers,
            [questionId]: value,
          },
        });
        return next;
      });
    },
    []
  );

  const handleTogglePlanPreview = useCallback(
    (toolCallId: string) => {
      const nextPreviewId =
        previewPlanToolCallId === toolCallId ? null : toolCallId;
      setPreviewPlanToolCallId(nextPreviewId);

      if (!onPreviewPlanChange) {
        return;
      }

      if (nextPreviewId === null) {
        onPreviewPlanChange(null);
        return;
      }

      const pending = pendingPlans.get(toolCallId);
      onPreviewPlanChange(pending ? pending.plan : null);
    },
    [onPreviewPlanChange, pendingPlans, previewPlanToolCallId]
  );

  const handleApprovePlan = useCallback(
    async (toolCallId: string) => {
      const pendingPlan = pendingPlans.get(toolCallId);
      if (!pendingPlan) {
        return;
      }

      setPendingPlans((prev) => {
        const next = new Map(prev);
        next.set(toolCallId, {
          ...pendingPlan,
          status: "executing",
        });
        return next;
      });

      try {
        const result = await approveManifestPlan(
          boardId,
          pendingPlan.plan.planId,
          pendingPlan.answers
        );

        if (result.success) {
          toast.success(result.summary);
          setPendingPlans((prev) => {
            const next = new Map(prev);
            next.set(toolCallId, {
              ...pendingPlan,
              status: "executed",
              resultSummary: result.summary,
            });
            return next;
          });
          if (previewPlanToolCallId === toolCallId) {
            onPreviewPlanChange?.(null);
            setPreviewPlanToolCallId(null);
          }
        } else {
          toast.error(result.error ?? result.summary);
          setPendingPlans((prev) => {
            const next = new Map(prev);
            next.set(toolCallId, {
              ...pendingPlan,
              status: "failed",
              resultSummary: result.summary,
              error: result.error,
            });
            return next;
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Plan execution failed";
        toast.error(message);
        setPendingPlans((prev) => {
          const next = new Map(prev);
          next.set(toolCallId, {
            ...pendingPlan,
            status: "failed",
            error: message,
          });
          return next;
        });
      }
    },
    [boardId, onPreviewPlanChange, pendingPlans, previewPlanToolCallId]
  );

  const handleRejectPlan = useCallback(
    (toolCallId: string) => {
      setPendingPlans((prev) => {
        const pendingPlan = prev.get(toolCallId);
        if (!pendingPlan) {
          return prev;
        }
        const next = new Map(prev);
        next.set(toolCallId, {
          ...pendingPlan,
          status: "rejected",
        });
        return next;
      });

      if (previewPlanToolCallId === toolCallId) {
        onPreviewPlanChange?.(null);
        setPreviewPlanToolCallId(null);
      }
    },
    [onPreviewPlanChange, previewPlanToolCallId]
  );

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="flex w-[400px] flex-col sm:max-w-[400px]"
        side="right"
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
              className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
              key={qp.label}
              onClick={() => {
                setInput(qp.prompt);
                textareaRef.current?.focus();
              }}
              type="button"
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
                className={`flex gap-2 ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
                key={message.id}
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
                  {(() => {
                    let renderedPartCount = 0;
                    const renderedParts = message.parts.map((part, idx) => {
                      if (part.type === "text") {
                        renderedPartCount += 1;
                        return (
                          <p className="whitespace-pre-wrap" key={idx}>
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
                            renderedPartCount += 1;
                            return (
                              <div
                                className="flex items-center gap-2 text-muted-foreground text-xs"
                                key={idx}
                              >
                                <Loader2Icon className="h-3 w-3 animate-spin" />
                                Preparing suggestion...
                              </div>
                            );
                          }

                          return (
                            <div
                              className="flex items-center justify-between gap-2 rounded-md bg-background/50 p-2"
                              key={idx}
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
                                    className="h-6 w-6"
                                    onClick={() =>
                                      handleApproveAction(toolCallId)
                                    }
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <CheckIcon className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button
                                    className="h-6 w-6"
                                    onClick={() =>
                                      handleRejectAction(toolCallId)
                                    }
                                    size="icon"
                                    variant="ghost"
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
                                  className="shrink-0 text-xs"
                                  variant="secondary"
                                >
                                  Done
                                </Badge>
                              )}

                              {action.status === "rejected" && (
                                <Badge
                                  className="shrink-0 text-muted-foreground text-xs"
                                  variant="outline"
                                >
                                  Skipped
                                </Badge>
                              )}

                              {action.status === "failed" && (
                                <Badge
                                  className="shrink-0 text-xs"
                                  variant="destructive"
                                >
                                  Failed
                                </Badge>
                              )}
                            </div>
                          );
                        }

                        if (part.type === "tool-suggest_manifest_plan") {
                          const pendingPlan = pendingPlans.get(toolCallId);
                          if (!pendingPlan) {
                            if (part.state === "output-available") {
                              const output = part.output as
                                | { error?: string; message?: string }
                                | undefined;
                              renderedPartCount += 1;
                              return (
                                <div
                                  className="rounded-md bg-background/50 p-2 text-muted-foreground text-xs"
                                  key={idx}
                                >
                                  {output?.error ??
                                    output?.message ??
                                    "Plan generation did not return a valid plan. Try again with a shorter request."}
                                </div>
                              );
                            }
                            renderedPartCount += 1;
                            return (
                              <div
                                className="flex items-center gap-2 text-muted-foreground text-xs"
                                key={idx}
                              >
                                <Loader2Icon className="h-3 w-3 animate-spin" />
                                Building plan...
                              </div>
                            );
                          }

                          const requiredQuestions =
                            pendingPlan.plan.prerequisites.filter(
                              (q) => q.required
                            );
                          const missingRequired = requiredQuestions.filter(
                            (q) => !pendingPlan.answers[q.questionId]
                          );
                          const canApprove = missingRequired.length === 0;
                          const previewActive =
                            previewPlanToolCallId === toolCallId;

                          renderedPartCount += 1;
                          return (
                            <div
                              className="space-y-2 rounded-md bg-background/50 p-2"
                              key={idx}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-xs">
                                    {pendingPlan.plan.title}
                                  </span>
                                  <Badge variant="outline">
                                    {Math.round(
                                      pendingPlan.plan.confidence * 100
                                    )}
                                    % confidence
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                  {pendingPlan.plan.summary}
                                </p>
                              </div>

                              <div className="space-y-1 rounded border border-border/60 p-2 text-xs">
                                <p className="font-medium">
                                  Board changes (
                                  {pendingPlan.plan.boardPreview.length})
                                </p>
                                <p className="text-muted-foreground">
                                  {pendingPlan.plan.boardPreview
                                    .map((m) => m.type)
                                    .join(", ") || "No board preview changes"}
                                </p>
                              </div>

                              <div className="space-y-1 rounded border border-border/60 p-2 text-xs">
                                <p className="font-medium">
                                  Domain effects (
                                  {pendingPlan.plan.domainPlan.length})
                                </p>
                                <div className="space-y-1 text-muted-foreground">
                                  {pendingPlan.plan.domainPlan.length === 0 && (
                                    <p>No domain steps</p>
                                  )}
                                  {pendingPlan.plan.domainPlan.map((step) => (
                                    <p key={step.stepId}>
                                      {step.commandName}
                                      {step.entityType && step.entityId
                                        ? ` on ${step.entityType}:${step.entityId}`
                                        : ""}
                                    </p>
                                  ))}
                                </div>
                              </div>

                              {/* Risk Assessment */}
                              {pendingPlan.plan.riskAssessment && (
                                <div className="space-y-1 rounded border border-border/60 p-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium">
                                      Risk Assessment
                                    </p>
                                    <Badge
                                      variant={(() => {
                                        const level =
                                          pendingPlan.plan.riskAssessment.level;
                                        if (level === "critical")
                                          return "destructive";
                                        if (level === "high") return "outline";
                                        return "secondary";
                                      })()}
                                    >
                                      {pendingPlan.plan.riskAssessment.level}
                                    </Badge>
                                  </div>
                                  {pendingPlan.plan.riskAssessment.factors
                                    .length > 0 && (
                                    <div className="text-muted-foreground">
                                      <p className="font-medium text-[10px] uppercase">
                                        Factors
                                      </p>
                                      <ul className="list-inside list-disc">
                                        {pendingPlan.plan.riskAssessment.factors.map(
                                          (factor, i) => (
                                            <li key={i}>{factor}</li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                  {pendingPlan.plan.riskAssessment.mitigations
                                    .length > 0 && (
                                    <div className="text-muted-foreground">
                                      <p className="font-medium text-[10px] uppercase">
                                        Mitigations
                                      </p>
                                      <ul className="list-inside list-disc">
                                        {pendingPlan.plan.riskAssessment.mitigations.map(
                                          (m, i) => (
                                            <li key={i}>{m}</li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Cost Impact / Financial Delta */}
                              {pendingPlan.plan.costImpact && (
                                <div className="space-y-1 rounded border border-border/60 p-2 text-xs">
                                  <p className="font-medium">
                                    Financial Impact
                                  </p>
                                  {pendingPlan.plan.costImpact.estimatedCost !==
                                    undefined && (
                                    <p className="text-muted-foreground">
                                      Estimated:{" "}
                                      {pendingPlan.plan.costImpact.currency}{" "}
                                      {pendingPlan.plan.costImpact.estimatedCost.toLocaleString()}
                                    </p>
                                  )}
                                  {pendingPlan.plan.costImpact
                                    .financialDelta && (
                                    <div className="mt-1 space-y-0.5">
                                      <p className="font-medium text-[10px] uppercase text-muted-foreground">
                                        Financial Delta
                                      </p>
                                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground">
                                        <span>Revenue:</span>
                                        <span
                                          className={
                                            (pendingPlan.plan.costImpact
                                              .financialDelta.revenue ?? 0) >= 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }
                                        >
                                          +
                                          {pendingPlan.plan.costImpact.financialDelta.revenue.toLocaleString()}
                                        </span>
                                        <span>Cost:</span>
                                        <span className="text-red-600">
                                          -
                                          {pendingPlan.plan.costImpact.financialDelta.cost.toLocaleString()}
                                        </span>
                                        <span>Profit:</span>
                                        <span
                                          className={
                                            (pendingPlan.plan.costImpact
                                              .financialDelta.profit ?? 0) >= 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }
                                        >
                                          {(
                                            pendingPlan.plan.costImpact
                                              .financialDelta.profit ?? 0
                                          ).toLocaleString()}
                                        </span>
                                        <span>Margin:</span>
                                        <span
                                          className={
                                            (pendingPlan.plan.costImpact
                                              .financialDelta.marginChange ??
                                              0) >= 0
                                              ? "text-green-600"
                                              : "text-red-600"
                                          }
                                        >
                                          {pendingPlan.plan.costImpact
                                            .financialDelta.marginChange ?? 0}
                                          %
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Execution Strategy */}
                              {pendingPlan.plan.executionStrategy && (
                                <div className="space-y-1 rounded border border-border/60 p-2 text-xs">
                                  <p className="font-medium">Execution Plan</p>
                                  <div className="text-muted-foreground">
                                    <p>
                                      Approach:{" "}
                                      <span className="font-medium capitalize">
                                        {
                                          pendingPlan.plan.executionStrategy
                                            .approach
                                        }
                                      </span>
                                    </p>
                                    {pendingPlan.plan.executionStrategy.steps
                                      .length > 0 && (
                                      <div className="mt-1">
                                        <p className="font-medium text-[10px] uppercase">
                                          Steps
                                        </p>
                                        <ol className="list-inside list-decimal">
                                          {pendingPlan.plan.executionStrategy.steps.map(
                                            (step, i) => (
                                              <li key={i}>{step}</li>
                                            )
                                          )}
                                        </ol>
                                      </div>
                                    )}
                                    {pendingPlan.plan.executionStrategy
                                      .timeout && (
                                      <p>
                                        Timeout:{" "}
                                        {
                                          pendingPlan.plan.executionStrategy
                                            .timeout
                                        }
                                        s
                                      </p>
                                    )}
                                    {pendingPlan.plan.executionStrategy
                                      .retryPolicy && (
                                      <p>
                                        Retries:{" "}
                                        {
                                          pendingPlan.plan.executionStrategy
                                            .retryPolicy.maxAttempts
                                        }{" "}
                                        max
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Rollback Strategy */}
                              {pendingPlan.plan.rollbackStrategy && (
                                <div className="space-y-1 rounded border border-border/60 p-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium">Rollback Plan</p>
                                    <Badge
                                      variant={
                                        pendingPlan.plan.rollbackStrategy
                                          .enabled
                                          ? "outline"
                                          : "secondary"
                                      }
                                    >
                                      {pendingPlan.plan.rollbackStrategy.enabled
                                        ? "Enabled"
                                        : "Disabled"}
                                    </Badge>
                                  </div>
                                  {pendingPlan.plan.rollbackStrategy
                                    .enabled && (
                                    <div className="text-muted-foreground">
                                      <p>
                                        Strategy:{" "}
                                        <span className="font-medium">
                                          {pendingPlan.plan.rollbackStrategy.strategy.replace(
                                            "_",
                                            " "
                                          )}
                                        </span>
                                      </p>
                                      {pendingPlan.plan.rollbackStrategy.steps
                                        .length > 0 && (
                                        <div className="mt-1">
                                          <p className="font-medium text-[10px] uppercase">
                                            Rollback Steps
                                          </p>
                                          <ul className="list-inside list-disc">
                                            {pendingPlan.plan.rollbackStrategy.steps.map(
                                              (step, i) => (
                                                <li key={i}>
                                                  {step.commandName}
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                      {pendingPlan.plan.rollbackStrategy
                                        .estimatedRecoveryTime && (
                                        <p>
                                          Recovery time: ~{" "}
                                          {
                                            pendingPlan.plan.rollbackStrategy
                                              .estimatedRecoveryTime
                                          }{" "}
                                          min
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {pendingPlan.plan.prerequisites.length > 0 && (
                                <div className="space-y-2 rounded border border-border/60 p-2 text-xs">
                                  <p className="font-medium">
                                    Required inputs ({missingRequired.length}{" "}
                                    missing)
                                  </p>
                                  {pendingPlan.plan.prerequisites.map(
                                    (question) => (
                                      <div
                                        className="block space-y-1"
                                        key={question.questionId}
                                      >
                                        <span>
                                          {question.prompt}
                                          {question.required ? " *" : ""}
                                        </span>
                                        {question.type === "select" ||
                                        question.type === "enum" ? (
                                          <select
                                            className="w-full rounded border border-input bg-background px-2 py-1"
                                            onChange={(event) =>
                                              handlePlanAnswerChange(
                                                toolCallId,
                                                question.questionId,
                                                event.target.value
                                              )
                                            }
                                            value={
                                              pendingPlan.answers[
                                                question.questionId
                                              ] ?? ""
                                            }
                                          >
                                            <option value="">Select...</option>
                                            {(question.options ?? []).map(
                                              (option) => (
                                                <option
                                                  key={option}
                                                  value={option}
                                                >
                                                  {option}
                                                </option>
                                              )
                                            )}
                                          </select>
                                        ) : (
                                          <input
                                            className="w-full rounded border border-input bg-background px-2 py-1"
                                            onChange={(event) =>
                                              handlePlanAnswerChange(
                                                toolCallId,
                                                question.questionId,
                                                event.target.value
                                              )
                                            }
                                            type={(() => {
                                              if (question.type === "number") {
                                                return "number";
                                              }
                                              if (question.type === "date") {
                                                return "date";
                                              }
                                              return "text";
                                            })()}
                                            value={
                                              pendingPlan.answers[
                                                question.questionId
                                              ] ?? ""
                                            }
                                          />
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {pendingPlan.status === "pending" && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    className="h-7 text-xs"
                                    onClick={() =>
                                      handleTogglePlanPreview(toolCallId)
                                    }
                                    size="sm"
                                    variant="outline"
                                  >
                                    {previewActive ? "Hide preview" : "Preview"}
                                  </Button>
                                  <Button
                                    className="h-7 text-xs"
                                    disabled={!canApprove}
                                    onClick={() =>
                                      handleApprovePlan(toolCallId)
                                    }
                                    size="sm"
                                  >
                                    Approve plan
                                  </Button>
                                  <Button
                                    className="h-7 text-xs"
                                    onClick={() => handleRejectPlan(toolCallId)}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}

                              {pendingPlan.status === "executing" && (
                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                  <Loader2Icon className="h-3 w-3 animate-spin" />
                                  Executing plan...
                                </div>
                              )}

                              {pendingPlan.status === "executed" && (
                                <Badge variant="secondary">
                                  {pendingPlan.resultSummary ?? "Plan executed"}
                                </Badge>
                              )}

                              {pendingPlan.status === "rejected" && (
                                <Badge variant="outline">Plan skipped</Badge>
                              )}

                              {pendingPlan.status === "failed" && (
                                <Badge variant="destructive">
                                  {pendingPlan.error ??
                                    pendingPlan.resultSummary ??
                                    "Plan failed"}
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
                          renderedPartCount += 1;
                          return (
                            <div
                              className="flex items-center gap-2 text-muted-foreground text-xs"
                              key={idx}
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
                    });

                    if (
                      renderedPartCount === 0 &&
                      message.role === "assistant"
                    ) {
                      return (
                        <>
                          {renderedParts}
                          <p className="text-muted-foreground text-xs">
                            Processed request. No text was returned by the
                            model.
                          </p>
                        </>
                      );
                    }

                    return renderedParts;
                  })()}
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
              className="min-h-[60px] resize-none"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your board..."
              ref={textareaRef}
              rows={2}
              value={input}
            />
            <Button
              className="shrink-0 self-end"
              disabled={!input.trim() || isLoading}
              onClick={handleSend}
              size="icon"
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
