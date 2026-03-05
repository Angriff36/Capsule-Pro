"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  GitBranch,
  Lightbulb,
  Network,
  Sparkles,
  Zap,
} from "lucide-react";
import type { TemporalPattern } from "../actions/ai-context-aware-suggestions";
import type {
  SuggestedAction,
  SuggestionPriority,
} from "../actions/suggestions-types";

const priorityConfig: Record<
  SuggestionPriority,
  { color: string; icon: typeof AlertTriangle; bgColor: string }
> = {
  high: {
    color: "text-red-700 border-red-200",
    icon: AlertTriangle,
    bgColor: "bg-red-50",
  },
  medium: {
    color: "text-amber-700 border-amber-200",
    icon: Clock,
    bgColor: "bg-amber-50",
  },
  low: {
    color: "text-blue-700 border-blue-200",
    icon: Sparkles,
    bgColor: "bg-blue-50",
  },
};

const temporalIconMap: Record<
  TemporalPattern["type"],
  { icon: typeof Clock; color: string; label: string }
> = {
  upcoming_deadline: {
    icon: Calendar,
    color: "text-amber-600",
    label: "Deadline",
  },
  overdue: { icon: AlertTriangle, color: "text-red-600", label: "Overdue" },
  due_soon: { icon: Clock, color: "text-amber-600", label: "Due Soon" },
  conflict: { icon: GitBranch, color: "text-red-600", label: "Conflict" },
  gap: { icon: Lightbulb, color: "text-blue-600", label: "Gap" },
};

interface AiInsightCardProps {
  suggestion: SuggestedAction;
  onDismiss?: (suggestionId: string) => void;
  onAction?: (suggestion: SuggestedAction) => void;
  isExecuting?: boolean;
}

export function AiInsightCard({
  suggestion,
  onDismiss,
  onAction,
  isExecuting = false,
}: AiInsightCardProps) {
  const priority = priorityConfig[suggestion.priority];
  const PriorityIcon = priority.icon;

  // Extract reasoning from metadata
  const reasoning =
    typeof suggestion.metadata?.reasoning === "string"
      ? suggestion.metadata.reasoning
      : undefined;

  // Extract affected entities from metadata
  const affectedEntities = Array.isArray(suggestion.metadata?.affectedEntities)
    ? suggestion.metadata.affectedEntities
    : undefined;

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${priority.bgColor} ${priority.color} border`}
            >
              <PriorityIcon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">
                  {suggestion.title}
                </CardTitle>
                {suggestion.metadata?.aiGenerated ? (
                  <Badge
                    className="bg-purple-100 text-purple-700 border-purple-200"
                    title="AI-generated based on board state analysis"
                    variant="outline"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span className="ml-1">AI</span>
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge className="text-xs" variant="outline">
                  {suggestion.category}
                </Badge>
                <Badge
                  className={`text-xs ${priority.bgColor} ${priority.color} border`}
                  variant="outline"
                >
                  {suggestion.priority}
                </Badge>
                {suggestion.type !== "deadline_alert" && (
                  <Badge className="text-xs" variant="secondary">
                    {suggestion.type.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {onDismiss ? (
            <Button
              className="h-6 w-6 shrink-0 p-0"
              disabled={isExecuting}
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(suggestion.id);
              }}
              size="sm"
              variant="ghost"
            >
              <span className="text-xs">×</span>
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <CardDescription className="text-xs">
          {suggestion.description}
        </CardDescription>

        {/* AI Reasoning */}
        {reasoning && (
          <div className="rounded-md bg-purple-50 border border-purple-100 px-2 py-1.5">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-3 w-3 text-purple-600 shrink-0" />
              <span className="text-purple-700 text-xs">{reasoning}</span>
            </div>
          </div>
        )}

        {/* Affected Entities */}
        {affectedEntities && affectedEntities.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Network className="h-3 w-3 text-muted-foreground shrink-0" />
            {affectedEntities.slice(0, 3).map((entity: unknown, i: number) => {
              const e = entity as { name?: string; type?: string };
              return (
                <Badge
                  className="text-xs bg-muted/50"
                  key={i}
                  variant="secondary"
                >
                  {e.name || e.type || "Entity"}
                </Badge>
              );
            })}
            {affectedEntities.length > 3 && (
              <span className="text-muted-foreground text-xs">
                +{affectedEntities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Estimated Impact */}
        {suggestion.estimatedImpact && (
          <div className="flex items-start gap-2 rounded-md bg-green-50 border border-green-100 px-2 py-1.5">
            <Zap className="mt-0.5 h-3 w-3 text-green-600 shrink-0" />
            <span className="text-green-700 text-xs">
              <span className="font-medium">Impact:</span>{" "}
              {suggestion.estimatedImpact}
            </span>
          </div>
        )}

        {/* Action Button */}
        <Button
          className="w-full gap-1.5"
          disabled={isExecuting}
          onClick={() => onAction?.(suggestion)}
          size="sm"
          variant="default"
        >
          {isExecuting ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Processing...
            </>
          ) : (
            <>
              {suggestion.action.type === "bulk_create_cards"
                ? `Add ${suggestion.action.cards.length} Cards`
                : suggestion.action.type === "api_call"
                  ? "Execute Action"
                  : suggestion.action.type === "navigate"
                    ? "Open"
                    : "Take Action"}
              <ArrowRight className="h-3 w-3" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface AiInsightCardListProps {
  suggestions: SuggestedAction[];
  isLoading?: boolean;
  onDismiss?: (suggestionId: string) => void;
  onAction?: (suggestion: SuggestedAction) => void;
  executingId?: string | null;
}

export function AiInsightCardList({
  suggestions,
  isLoading = false,
  onDismiss,
  onAction,
  executingId,
}: AiInsightCardListProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="h-8 w-8 animate-pulse text-purple-400" />
          <span>Analyzing board state...</span>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-6">
        <CheckCircle2 className="mb-3 h-12 w-12 text-green-500" />
        <p className="text-muted-foreground text-sm">
          No suggestions at this time. Everything looks good!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((suggestion) => (
        <AiInsightCard
          isExecuting={executingId === suggestion.id}
          key={suggestion.id}
          onAction={onAction}
          onDismiss={onDismiss}
          suggestion={suggestion}
        />
      ))}
    </div>
  );
}
