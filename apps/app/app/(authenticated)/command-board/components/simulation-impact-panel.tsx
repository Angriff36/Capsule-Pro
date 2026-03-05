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
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { BoardDelta } from "../actions/boards";
import type {
  SimulationImpactAnalysis,
  SimulationScenario,
} from "../types/simulation";

interface SimulationImpactPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulationId: string;
  sourceBoardId: string;
  initialDelta?: BoardDelta | null;
}

interface ScenarioSuggestionsPanelProps {
  boardId: string;
  tenantId: string;
  onSelectScenario: (scenario: SimulationScenario) => void;
}

// ============================================================================
// Impact Score Display
// ============================================================================

function ImpactScoreDisplay({
  level,
  value,
  confidence,
}: {
  level: "low" | "medium" | "high" | "critical";
  value: number;
  confidence: number;
}) {
  const levelColors = {
    low: "text-green-600 bg-green-50 border-green-200",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    high: "text-orange-600 bg-orange-50 border-orange-200",
    critical: "text-red-600 bg-red-50 border-red-200",
  };

  const progressColor = {
    low: "bg-green-500",
    medium: "bg-amber-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  return (
    <div className={`rounded-lg border p-4 ${levelColors[level]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium uppercase">Impact Level</span>
        <span className="text-lg font-bold capitalize">{level}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Impact Score</span>
          <span className="font-medium">{value}/100</span>
        </div>
        <Progress className="h-2" value={value} />
      </div>
      <div className="mt-2 text-xs opacity-80">
        Confidence: {Math.round(confidence * 100)}%
      </div>
    </div>
  );
}

// ============================================================================
// Predicted Outcome Card
// ============================================================================

function PredictedOutcomeCard({
  outcome,
}: {
  outcome: {
    changeType: "addition" | "removal" | "modification";
    entityType: string;
    entityId: string;
    entityName?: string;
    impact: {
      level: "low" | "medium" | "high" | "critical";
      value: number;
      confidence: number;
    };
    predictedEffects: string[];
    cascadingImpacts: Array<{
      entityType: string;
      entityId: string;
      effect: string;
    }>;
  };
}) {
  const changeIcons = {
    addition: <CheckCircle2Icon className="h-4 w-4 text-green-600" />,
    removal: <XIcon className="h-4 w-4 text-red-600" />,
    modification: <InfoIcon className="h-4 w-4 text-blue-600" />,
  };

  const impactColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start gap-2 mb-2">
        {changeIcons[outcome.changeType]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {outcome.entityName || outcome.entityId}
            </span>
            <Badge className="text-xs" variant="outline">
              {outcome.changeType}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {outcome.entityType}
          </div>
        </div>
        <Badge
          className={`text-xs ${impactColors[outcome.impact.level]}`}
          variant="secondary"
        >
          {outcome.impact.level}
        </Badge>
      </div>

      {outcome.predictedEffects.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 mt-2">
          {outcome.predictedEffects.slice(0, 3).map((effect, i) => (
            <li className="flex items-start gap-1" key={i}>
              <span>•</span>
              <span>{effect}</span>
            </li>
          ))}
        </ul>
      )}

      {outcome.cascadingImpacts.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            Cascading Impacts:
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {outcome.cascadingImpacts.slice(0, 2).map((impact, i) => (
              <li className="flex items-start gap-1" key={i}>
                <span>→</span>
                <span>{impact.effect}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Simulation Impact Panel
// ============================================================================

export function SimulationImpactPanel({
  open,
  onOpenChange,
  simulationId,
  sourceBoardId,
  initialDelta,
}: SimulationImpactPanelProps) {
  const [analysis, setAnalysis] = useState<SimulationImpactAnalysis | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"ai" | "fallback">("fallback");

  useEffect(() => {
    if (open && simulationId && !analysis) {
      setIsLoading(true);
      setError(null);

      apiFetch(
        `/api/command-board/simulations/impact?simulationId=${simulationId}&useAi=true`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.analysis) {
            setAnalysis(data.analysis);
            setMethod(data.method || "fallback");
          } else if (data.error) {
            setError(data.error);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch impact analysis:", err);
          setError("Failed to analyze simulation impact");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, simulationId, analysis]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l bg-background shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Simulation Impact</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis of changes
            </p>
          </div>
          <Button onClick={handleClose} size="icon" variant="ghost">
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        {method === "ai" && (
          <Badge className="mt-2" variant="secondary">
            AI Analysis
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Analyzing simulation impact...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Overall Impact */}
            <ImpactScoreDisplay
              confidence={analysis.overallImpact.confidence}
              level={analysis.overallImpact.level}
              value={analysis.overallImpact.value}
            />

            {/* Tabs */}
            <Tabs className="w-full" defaultValue="outcomes">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
                <TabsTrigger value="risks">Risks</TabsTrigger>
                <TabsTrigger value="advice">Advice</TabsTrigger>
                <TabsTrigger value="delta">Delta</TabsTrigger>
              </TabsList>

              {/* Outcomes Tab */}
              <TabsContent className="space-y-2 mt-4" value="outcomes">
                {analysis.outcomes.length > 0 ? (
                  analysis.outcomes.map((outcome, i) => (
                    <PredictedOutcomeCard key={i} outcome={outcome} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No significant outcomes to display
                  </p>
                )}
              </TabsContent>

              {/* Risks Tab */}
              <TabsContent className="space-y-3 mt-4" value="risks">
                {analysis.riskFactors.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangleIcon className="h-4 w-4" />
                      <span className="font-medium">Risk Factors</span>
                    </div>
                    {analysis.riskFactors.map((risk, i) => (
                      <div
                        className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30"
                        key={i}
                      >
                        <p className="text-sm">{risk}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle2Icon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No significant risks detected
                    </p>
                  </div>
                )}

                {analysis.requiresManualReview && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                      <InfoIcon className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        Manual Review Required
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This simulation has changes that should be reviewed before
                      merging.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Advice Tab */}
              <TabsContent className="space-y-3 mt-4" value="advice">
                {analysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li
                          className="text-sm flex items-start gap-2 text-muted-foreground"
                          key={i}
                        >
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.opportunities.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Opportunities</h4>
                    <ul className="space-y-2">
                      {analysis.opportunities.map((opp, i) => (
                        <li
                          className="text-sm flex items-start gap-2 text-green-700 dark:text-green-400"
                          key={i}
                        >
                          <span>✓</span>
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.estimatedTimeToApply && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      Estimated time to apply:{" "}
                      <span className="font-medium text-foreground">
                        {analysis.estimatedTimeToApply} minutes
                      </span>
                    </span>
                  </div>
                )}
              </TabsContent>

              {/* Delta Tab */}
              <TabsContent className="space-y-3 mt-4" value="delta">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border bg-green-50 p-2 dark:bg-green-950/30">
                    <div className="text-lg font-bold text-green-700 dark:text-green-400">
                      {analysis.delta.summary.additions}
                    </div>
                    <div className="text-xs text-muted-foreground">Added</div>
                  </div>
                  <div className="rounded-md border bg-amber-50 p-2 dark:bg-amber-950/30">
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      {analysis.delta.summary.modifications}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Modified
                    </div>
                  </div>
                  <div className="rounded-md border bg-red-50 p-2 dark:bg-red-950/30">
                    <div className="text-lg font-bold text-red-700 dark:text-red-400">
                      {analysis.delta.summary.removals}
                    </div>
                    <div className="text-xs text-muted-foreground">Removed</div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm">
                    <span className="font-medium">Total Changes: </span>
                    <span className="text-muted-foreground">
                      {analysis.delta.summary.totalChanges}
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8">
            <InfoIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No impact analysis available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Scenario Suggestions Panel
// ============================================================================

export function ScenarioSuggestionsPanel({
  boardId,
  tenantId,
  onSelectScenario,
}: ScenarioSuggestionsPanelProps) {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"ai" | "fallback">("fallback");

  useEffect(() => {
    if (boardId && tenantId && scenarios.length === 0) {
      setIsLoading(true);
      setError(null);

      apiFetch(
        `/api/command-board/simulations/scenarios?boardId=${boardId}&useAi=true`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.scenarios) {
            setScenarios(data.scenarios);
            setMethod(data.method || "fallback");
          } else if (data.error) {
            setError(data.error);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch scenarios:", err);
          setError("Failed to fetch scenario suggestions");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [boardId, tenantId, scenarios.length]);

  const categoryIcons = {
    resource: "👥",
    schedule: "📅",
    cost: "💰",
    risk: "⚠️",
    optimization: "⚡",
  };

  const priorityColors = {
    low: "bg-slate-100 text-slate-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-red-100 text-red-800",
  };

  const riskColors = {
    low: "text-green-600",
    medium: "text-amber-600",
    high: "text-red-600",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Scenario Suggestions</CardTitle>
            <CardDescription>
              AI-suggested what-if scenarios to explore
            </CardDescription>
          </div>
          {method === "ai" && <Badge variant="secondary">AI Generated</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Generating scenarios...
            </span>
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            {error}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No scenarios suggested
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <div
                className="rounded-md border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                key={scenario.scenarioId}
                onClick={() => onSelectScenario(scenario)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {categoryIcons[scenario.category]}
                    </span>
                    <h4 className="font-medium text-sm">{scenario.title}</h4>
                  </div>
                  <Badge
                    className={`text-xs ${priorityColors[scenario.priority]}`}
                    variant="secondary"
                  >
                    {scenario.priority}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-2">
                  {scenario.description}
                </p>

                <div className="flex items-center gap-3 text-xs">
                  <span className="font-medium text-green-700 dark:text-green-400">
                    💚 {scenario.estimatedValue}
                  </span>
                  <span className={riskColors[scenario.riskLevel]}>
                    Risk: {scenario.riskLevel}
                  </span>
                  {scenario.estimatedDuration && (
                    <span className="text-muted-foreground">
                      {scenario.estimatedDuration}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
