"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionsPanel = SuggestionsPanel;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
const priorityConfig = {
  high: {
    color: "bg-red-50 text-red-700 border-red-200",
    icon: lucide_react_1.AlertTriangle,
  },
  medium: {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: lucide_react_1.Clock,
  },
  low: {
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: lucide_react_1.Sparkles,
  },
};
function SuggestionsPanel({
  suggestions,
  isLoading = false,
  onDismiss,
  onRefresh,
  onAction,
  onClose,
}) {
  const handleSuggestionClick = (suggestion) => {
    if (onAction) {
      onAction(suggestion);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <lucide_react_1.Sparkles className="h-4 w-4 text-purple-600" />
          <h2 className="font-semibold text-sm">
            AI Suggestions ({suggestions.length})
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button_1.Button
              className="h-8 gap-1 text-xs"
              disabled={isLoading}
              onClick={onRefresh}
              size="sm"
              variant="ghost"
            >
              <lucide_react_1.RefreshCw
                className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button_1.Button>
          )}
          {onClose && (
            <button_1.Button
              className="h-8 w-8 p-0"
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              <lucide_react_1.X className="h-3 w-3" />
            </button_1.Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            <lucide_react_1.RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Generating suggestions...
          </div>
        ) : null}

        {!isLoading && suggestions.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <lucide_react_1.CheckCircle2 className="mb-3 h-12 w-12 text-muted-foreground" />
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
                <card_1.Card
                  className="overflow-hidden transition-all duration-200 hover:shadow-md"
                  key={suggestion.id}
                >
                  <card_1.CardHeader className="space-y-2 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${priority.color}`}
                        >
                          <PriorityIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <card_1.CardTitle className="text-sm font-medium">
                            {suggestion.title}
                          </card_1.CardTitle>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <badge_1.Badge
                              className="text-xs"
                              variant="outline"
                            >
                              {suggestion.category}
                            </badge_1.Badge>
                            <badge_1.Badge
                              className={`text-xs ${priority.color}`}
                              variant="outline"
                            >
                              {suggestion.priority}
                            </badge_1.Badge>
                          </div>
                        </div>
                      </div>
                      {onDismiss ? (
                        <button_1.Button
                          className="h-6 w-6 shrink-0 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(suggestion.id);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <lucide_react_1.X className="h-3 w-3" />
                        </button_1.Button>
                      ) : null}
                    </div>
                  </card_1.CardHeader>

                  <card_1.CardContent className="space-y-3 pt-0">
                    <card_1.CardDescription className="text-xs">
                      {suggestion.description}
                    </card_1.CardDescription>

                    {suggestion.estimatedImpact ? (
                      <div className="flex items-start gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                        <lucide_react_1.Calendar className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground text-xs">
                          <span className="font-medium">Impact:</span>{" "}
                          {suggestion.estimatedImpact}
                        </span>
                      </div>
                    ) : null}

                    <button_1.Button
                      className="w-full"
                      onClick={() => handleSuggestionClick(suggestion)}
                      size="sm"
                      variant="default"
                    >
                      Take Action
                    </button_1.Button>
                  </card_1.CardContent>
                </card_1.Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
