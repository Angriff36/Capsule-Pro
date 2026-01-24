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
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import type {
  SuggestedAction,
  SuggestionPriority,
} from "../lib/suggestions-types";

type SuggestionsPanelProps = {
  suggestions: SuggestedAction[];
  isLoading?: boolean;
  onDismiss?: (suggestionId: string) => void;
  onRefresh?: () => void;
  onAction?: (suggestion: SuggestedAction) => void;
  onClose?: () => void;
};

const priorityConfig: Record<
  SuggestionPriority,
  { color: string; icon: typeof AlertTriangle }
> = {
  high: { color: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
  medium: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  low: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Sparkles },
};

export function SuggestionsPanel({
  suggestions,
  isLoading = false,
  onDismiss,
  onRefresh,
  onAction,
  onClose,
}: SuggestionsPanelProps) {
  const handleSuggestionClick = (suggestion: SuggestedAction) => {
    if (onAction) {
      onAction(suggestion);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h2 className="font-semibold text-sm">
            AI Suggestions ({suggestions.length})
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              className="h-8 gap-1 text-xs"
              disabled={isLoading}
              onClick={onRefresh}
              size="sm"
              variant="ghost"
            >
              <RefreshCw
                className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
          {onClose && (
            <Button
              className="h-8 w-8 p-0"
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Generating suggestions...
          </div>
        ) : null}

        {!isLoading && suggestions.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No suggestions at this time. Everything looks good!
            </p>
          </div>
        )}

        {!isLoading && suggestions.length > 0 && (
          <div className="space-y-3">
            {suggestions.map((suggestion) => {
              const priority = priorityConfig[suggestion.priority];
              const PriorityIcon = priority.icon;

              return (
                <Card
                  className="overflow-hidden transition-all duration-200 hover:shadow-md"
                  key={suggestion.id}
                >
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${priority.color}`}
                        >
                          <PriorityIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm font-medium">
                            {suggestion.title}
                          </CardTitle>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge className="text-xs" variant="outline">
                              {suggestion.category}
                            </Badge>
                            <Badge
                              className={`text-xs ${priority.color}`}
                              variant="outline"
                            >
                              {suggestion.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {onDismiss ? (
                        <Button
                          className="h-6 w-6 shrink-0 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(suggestion.id);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <CardDescription className="text-xs">
                      {suggestion.description}
                    </CardDescription>

                    {suggestion.estimatedImpact ? (
                      <div className="flex items-start gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                        <Calendar className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground text-xs">
                          <span className="font-medium">Impact:</span>{" "}
                          {suggestion.estimatedImpact}
                        </span>
                      </div>
                    ) : null}

                    <Button
                      className="w-full"
                      onClick={() => handleSuggestionClick(suggestion)}
                      size="sm"
                      variant="default"
                    >
                      Take Action
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
