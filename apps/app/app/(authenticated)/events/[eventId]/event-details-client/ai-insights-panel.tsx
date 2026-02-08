"use client";

import {
  BudgetSection,
  ExecutiveSummarySection,
  PrepTasksSection,
  SuggestionsSection,
  TaskBreakdownSection,
} from "../event-details-sections";
import type {
  EventBudgetForDisplay,
  GeneratedEventSummary,
  TaskBreakdown,
} from "../event-details-sections";
import type { SuggestedAction } from "../../../kitchen/lib/suggestions-types";
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
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          AI Insights
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <ExecutiveSummarySection
            eventId={eventId}
            eventTitle={eventTitle}
            isLoading={isLoadingSummary}
            onDelete={onDeleteSummary}
            onGenerate={onGenerateSummary}
            onOpenGenerateModal={onOpenSummaryModal}
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
        <div className="space-y-6">
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
        </div>
      </div>
    </section>
  );
}
