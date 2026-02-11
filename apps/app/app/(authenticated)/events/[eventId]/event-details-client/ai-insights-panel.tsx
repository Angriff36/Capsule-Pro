"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { ArrowRightIcon, CheckCircle2Icon, CircleDashedIcon } from "lucide-react";
import type { SuggestedAction } from "../../../kitchen/lib/suggestions-types";
import type {
  EventBudgetForDisplay,
  GeneratedEventSummary,
  TaskBreakdown,
} from "../event-details-sections";
import {
  BudgetSection,
  ExecutiveSummarySection,
  PrepTasksSection,
  SuggestionsSection,
  TaskBreakdownSection,
} from "../event-details-sections";
import type { PrepTaskSummaryClient } from "../prep-task-contract";

interface AIInsightsPanelProps {
  eventId: string;
  eventTitle: string;
  summary: GeneratedEventSummary | null | undefined;
  isLoadingSummary: boolean;
  breakdown: TaskBreakdown | null;
  isGenerating: boolean;
  generationProgress: string;
  suggestions: SuggestedAction[];
  suggestionsLoading: boolean;
  showSuggestions: boolean;
  prepTasks: PrepTaskSummaryClient[];
  budget: EventBudgetForDisplay | null;
  // Handlers
  onGenerateSummary: () => Promise<GeneratedEventSummary>;
  onDeleteSummary: () => Promise<void>;
  onOpenSummaryModal: () => void;
  onOpenBreakdownModal: () => void;
  onRegenerateBreakdown: () => void;
  onExportBreakdown: () => void;
  onSaveBreakdown: () => void;
  onRefreshSuggestions: () => void;
  onDismissSuggestion: (id: string) => void;
  onHandleSuggestionAction: (suggestion: SuggestedAction) => void;
  onShowSuggestionsChange: (show: boolean) => void;
  onOpenGenerateModal: () => void;
  onViewBudget: (budgetId: string) => void;
  onCreateBudget: () => void;
}

export function AIInsightsPanel({
  eventId,
  eventTitle,
  summary,
  isLoadingSummary,
  breakdown,
  isGenerating,
  generationProgress,
  suggestions,
  suggestionsLoading,
  showSuggestions,
  prepTasks,
  budget,
  onGenerateSummary,
  onDeleteSummary,
  onOpenSummaryModal,
  onOpenBreakdownModal,
  onRegenerateBreakdown,
  onExportBreakdown,
  onSaveBreakdown,
  onRefreshSuggestions,
  onDismissSuggestion,
  onHandleSuggestionAction,
  onShowSuggestionsChange,
  onOpenGenerateModal,
  onViewBudget,
  onCreateBudget,
}: AIInsightsPanelProps) {
  const workflowSteps = [
    {
      key: "summary",
      label: "Summary",
      done: Boolean(summary),
      actionLabel: "Generate summary",
      onAction: onOpenSummaryModal,
    },
    {
      key: "task-plan",
      label: "Task plan",
      done: Boolean(breakdown),
      actionLabel: "Generate task plan",
      onAction: onOpenBreakdownModal,
    },
    {
      key: "recommendations",
      label: "Recommendations",
      done: suggestions.length === 0 || showSuggestions,
      actionLabel: "Review recommendations",
      onAction: () => onShowSuggestionsChange(true),
    },
    {
      key: "budget",
      label: "Budget",
      done: Boolean(budget),
      actionLabel: "Create budget",
      onAction: onCreateBudget,
    },
  ];

  const nextAction = workflowSteps.find((step) => !step.done) ?? null;
  const completedSteps = workflowSteps.filter((step) => step.done).length;
  const progressPercentage = Math.round(
    (completedSteps / workflowSteps.length) * 100
  );

  return (
    <section className="space-y-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-foreground/80 text-xs uppercase tracking-[0.18em]">
                Event Copilot
              </p>
              <CardTitle className="mt-1 text-lg">Operations workflow</CardTitle>
              <p className="mt-1 text-foreground/75 text-sm">
                One sequence for planning, briefing, and budget control.
              </p>
            </div>
            <div className="min-w-44 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
              <div className="flex items-center justify-between font-medium text-xs">
                <span>
                  {completedSteps}/{workflowSteps.length} complete
                </span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <button
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/30"
                key={step.key}
                onClick={step.onAction}
                type="button"
              >
                {step.done ? (
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                ) : (
                  <CircleDashedIcon className="size-4 text-foreground/55" />
                )}
                <span className="font-medium text-sm">
                  {index + 1}. {step.label}
                </span>
                <Badge className="ml-auto" variant="outline">
                  {step.done ? "Done" : "Pending"}
                </Badge>
              </button>
            ))}
          </div>
          {nextAction ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-2">
              <p className="text-foreground/80 text-sm">
                Next action: <span className="font-medium">{nextAction.label}</span>
              </p>
              <Button onClick={nextAction.onAction} size="sm" variant="outline">
                Open step
                <ArrowRightIcon className="ml-2 size-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <ExecutiveSummarySection
            eventId={eventId}
            eventTitle={eventTitle}
            isLoading={isLoadingSummary}
            onDelete={onDeleteSummary}
            onGenerate={onGenerateSummary}
            summary={summary}
          />
          <TaskBreakdownSection
            breakdown={breakdown}
            generationProgress={generationProgress}
            isGenerating={isGenerating}
            onExport={onExportBreakdown}
            onOpenGenerateModal={onOpenBreakdownModal}
            onRegenerate={onRegenerateBreakdown}
            onSave={onSaveBreakdown}
          />
        </div>
        <aside className="space-y-3">
          <Card className="border-border/70 bg-muted/15 shadow-sm">
            <CardContent className="px-4 py-3">
              <p className="font-medium text-sm">Action queue</p>
              <p className="text-foreground/75 text-xs">
                Resolve recommendations, prep tasks, and budget in one lane.
              </p>
            </CardContent>
          </Card>
          <SuggestionsSection
            isLoading={suggestionsLoading}
            onAction={onHandleSuggestionAction}
            onDismiss={onDismissSuggestion}
            onRefresh={onRefreshSuggestions}
            onShowSuggestionsChange={onShowSuggestionsChange}
            showSuggestions={showSuggestions}
            suggestions={suggestions}
          />
          <PrepTasksSection
            onOpenGenerateModal={onOpenGenerateModal}
            prepTasks={prepTasks}
          />
          <BudgetSection
            budget={budget}
            onCreateBudget={onCreateBudget}
            onViewBudget={onViewBudget}
          />
        </aside>
      </div>
    </section>
  );
}
