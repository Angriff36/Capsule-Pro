/**
 * Recipe Optimization Card Block
 *
 * Displays AI-powered recipe optimization suggestions including:
 * - Cost reduction opportunities
 * - Nutritional analysis and improvements
 * - Ingredient substitution suggestions
 * - Quality and availability scores
 *
 * @module kitchen-ops/recipe-optimization
 */

import {
  AlertTriangle,
  Apple,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Leaf,
  Lightbulb,
  Scale,
  Sparkles,
  TrendingDown,
  XCircle,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";

/**
 * Nutritional information per serving
 */
export interface NutritionalInfo {
  calories: number;
  carbohydrates: number;
  cholesterol: number;
  fat: number;
  fiber: number;
  protein: number;
  sodium: number;
  sugar: number;
}

/**
 * Nutritional improvement suggestion
 */
export interface NutritionalImprovement {
  currentValue: number;
  impact: string;
  nutrient: string;
  suggestion: string;
  targetValue: number;
  type: "reduce" | "increase" | "substitute";
}

/**
 * Nutritional analysis result
 */
export interface NutritionalAnalysis {
  concerns: string[];
  healthScore: number;
  improvementSuggestions: NutritionalImprovement[];
  nutrientHighlights: string[];
  perRecipe: NutritionalInfo;
  perServing: NutritionalInfo;
}

/**
 * Ingredient substitution suggestion
 */
export interface IngredientSubstitution {
  allergenChanges: string[];
  costSavings: number;
  costSavingsPercentage: number;
  originalCost: number;
  originalIngredientId: string;
  originalIngredientName: string;
  originalQuantity: number;
  originalUnitId: number;
  qualityImpact: "positive" | "neutral" | "negative";
  reason: string;
  suggestedCost: number;
  suggestedIngredientId: string;
  suggestedIngredientName: string;
  suggestedQuantity: number;
  suggestedUnitId: number;
}

/**
 * Cost optimization opportunity
 */
export interface CostOptimization {
  category:
    | "ingredient_substitution"
    | "quantity_adjustment"
    | "supplier_change"
    | "waste_reduction";
  description: string;
  implementation: string;
  potentialSavings: number;
  potentialSavingsPercentage: number;
  priority: "high" | "medium" | "low";
  risks: string[];
  substitutions: IngredientSubstitution[];
  title: string;
}

/**
 * Prioritized action from AI insights
 */
export interface PrioritizedAction {
  action: string;
  effort: "low" | "medium" | "high";
  expectedOutcome: string;
  rationale: string;
}

/**
 * AI insights for recipe optimization
 */
export interface AIInsights {
  dietaryAlternatives?: string[];
  prioritizedActions: PrioritizedAction[];
  seasonalConsiderations?: string;
  summary: string;
}

/**
 * Full recipe optimization result
 */
export interface RecipeOptimization {
  aiInsights?: AIInsights;
  availabilityScore: number;
  costOptimizations: CostOptimization[];
  currentCost: number;
  currentCostPerYield: number;
  generatedAt: Date | string;
  nutritionalAnalysis: NutritionalAnalysis;
  optimizedCost: number;
  optimizedCostPerYield: number;
  overallScore: number;
  qualityScore: number;
  recipeName: string;
  recipeVersionId: string;
  totalPotentialSavings: number;
  totalPotentialSavingsPercentage: number;
}

/**
 * Props for RecipeOptimizationCard component
 */
export interface RecipeOptimizationCardProps {
  /**
   * Optional CSS class
   */
  className?: string;

  /**
   * Optional callback when a substitution is applied
   */
  onApplySubstitution?: (substitution: IngredientSubstitution) => void;

  /**
   * Optional callback when dismissing the card
   */
  onDismiss?: () => void;
  /**
   * The optimization data to display
   */
  optimization: RecipeOptimization;

  /**
   * Whether to show the AI insights section
   */
  showAIInsights?: boolean;
}

/**
 * Score indicator component
 */
function ScoreIndicator({
  value,
  label,
  icon: Icon,
  color = "bg-blue-500",
}: {
  value: number;
  label: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-10 w-10">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path
            className="stroke-current text-muted"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeWidth="3"
          />
          <path
            className={`${color} stroke-current`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            strokeDasharray={`${value}, 100`}
            strokeWidth="3"
          />
        </svg>
        <Icon className="absolute inset-0 m-auto h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-muted-foreground text-xs">{label}</div>
        <div className="font-semibold text-sm">{value}/100</div>
      </div>
    </div>
  );
}

/**
 * Collapsible section component
 */
function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        className="flex w-full items-center justify-between p-3 transition-colors hover:bg-muted/50"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="border-t p-3">{children}</div>}
    </div>
  );
}

/**
 * Recipe optimization card with AI-powered insights
 */
export function RecipeOptimizationCard({
  optimization,
  onApplySubstitution,
  onDismiss,
  showAIInsights = true,
  className,
}: RecipeOptimizationCardProps) {
  const savingsColor =
    optimization.totalPotentialSavingsPercentage > 10
      ? "text-green-600"
      : optimization.totalPotentialSavingsPercentage > 5
        ? "text-emerald-600"
        : "text-blue-600";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getQualityImpactColor = (impact: string) => {
    switch (impact) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "low":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-amber-100 text-amber-700";
      case "high":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Recipe Optimization</CardTitle>
            <Badge className="ml-2" variant="outline">
              AI-Powered
            </Badge>
          </div>
          {onDismiss && (
            <Button onClick={onDismiss} size="sm" variant="ghost">
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          {optimization.recipeName} • {optimization.costOptimizations.length}{" "}
          optimization
          {optimization.costOptimizations.length === 1 ? "" : "s"} found
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <DollarSign className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
            <div className="text-muted-foreground text-xs">
              Potential Savings
            </div>
            <div className={`font-bold text-lg ${savingsColor}`}>
              {optimization.totalPotentialSavingsPercentage.toFixed(1)}%
            </div>
            <div className="text-muted-foreground text-xs">
              ${optimization.totalPotentialSavings.toFixed(2)}
            </div>
          </div>

          <ScoreIndicator
            color="bg-green-500"
            icon={CheckCircle2}
            label="Availability"
            value={Math.round(optimization.availabilityScore)}
          />

          <ScoreIndicator
            color="bg-blue-500"
            icon={Scale}
            label="Quality"
            value={Math.round(optimization.qualityScore)}
          />

          <ScoreIndicator
            color={
              optimization.nutritionalAnalysis.healthScore > 70
                ? "bg-green-500"
                : "bg-amber-500"
            }
            icon={Apple}
            label="Health"
            value={optimization.nutritionalAnalysis.healthScore}
          />
        </div>

        <Separator />

        {/* AI Insights */}
        {showAIInsights && optimization.aiInsights && (
          <CollapsibleSection
            badge={
              optimization.aiInsights.prioritizedActions.length > 0 ? (
                <Badge className="ml-2" variant="secondary">
                  {optimization.aiInsights.prioritizedActions.length} actions
                </Badge>
              ) : null
            }
            defaultOpen
            icon={Lightbulb}
            title="AI Recommendations"
          >
            <p className="mb-4 text-muted-foreground text-sm">
              {optimization.aiInsights.summary}
            </p>

            {optimization.aiInsights.prioritizedActions.length > 0 && (
              <div className="space-y-3">
                {optimization.aiInsights.prioritizedActions.map(
                  (action, idx) => (
                    <div className="flex gap-3 rounded-lg border p-3" key={idx}>
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-xs">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{action.action}</p>
                          <Badge
                            className={getEffortColor(action.effort)}
                            variant="outline"
                          >
                            {action.effort} effort
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {action.rationale}
                        </p>
                        <p className="text-green-600 text-xs">
                          <TrendingDown className="mr-1 inline h-3 w-3" />
                          {action.expectedOutcome}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {optimization.aiInsights.seasonalConsiderations && (
              <Alert className="mt-4">
                <Leaf className="h-4 w-4" />
                <AlertTitle>Seasonal Note</AlertTitle>
                <AlertDescription className="text-xs">
                  {optimization.aiInsights.seasonalConsiderations}
                </AlertDescription>
              </Alert>
            )}
          </CollapsibleSection>
        )}

        {/* Cost Optimizations */}
        <CollapsibleSection
          defaultOpen
          icon={TrendingDown}
          title="Cost Reduction Opportunities"
        >
          {optimization.costOptimizations.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              No cost optimization opportunities identified. Your recipe is
              already optimized!
            </div>
          ) : (
            <div className="space-y-3">
              {optimization.costOptimizations.map((opt, idx) => (
                <div className="space-y-2 rounded-lg border p-3" key={idx}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="font-medium text-sm">{opt.title}</h4>
                        <Badge
                          className={getPriorityColor(opt.priority)}
                          variant="outline"
                        >
                          {opt.priority}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {opt.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        -${opt.potentialSavings.toFixed(2)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {opt.potentialSavingsPercentage.toFixed(1)}% savings
                      </div>
                    </div>
                  </div>

                  {opt.substitutions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {opt.substitutions.map((sub, subIdx) => (
                        <div
                          className="flex items-center justify-between rounded bg-muted/50 p-2 text-sm"
                          key={subIdx}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowDown className="h-3 w-3 text-red-500" />
                            <span className="text-muted-foreground line-through">
                              {sub.originalIngredientName}
                            </span>
                            <ArrowUp className="h-3 w-3 text-green-500" />
                            <span className="font-medium">
                              {sub.suggestedIngredientName}
                            </span>
                            {sub.qualityImpact !== "neutral" && (
                              <Badge
                                className={`text-xs ${getQualityImpactColor(sub.qualityImpact)}`}
                                variant="outline"
                              >
                                {sub.qualityImpact}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-600">
                              -${sub.costSavings.toFixed(2)}
                            </span>
                            {onApplySubstitution && (
                              <Button
                                className="h-7 text-xs"
                                onClick={() => onApplySubstitution(sub)}
                                size="sm"
                                variant="outline"
                              >
                                Apply
                              </Button>
                            )}
                          </div>
                          <p className="col-span-full mt-1 text-muted-foreground text-xs">
                            {sub.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {opt.implementation && (
                    <div className="rounded bg-blue-50 p-2 text-muted-foreground text-xs dark:bg-blue-950/20">
                      <span className="font-medium">Implementation:</span>{" "}
                      {opt.implementation}
                    </div>
                  )}

                  {opt.risks.length > 0 && (
                    <Alert className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Risks:</strong> {opt.risks.join("; ")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Nutritional Analysis */}
        <CollapsibleSection
          badge={
            <Badge
              className={`ml-2 ${
                optimization.nutritionalAnalysis.healthScore > 70
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-amber-200 bg-amber-100 text-amber-700"
              }`}
              variant="outline"
            >
              Score: {optimization.nutritionalAnalysis.healthScore}/100
            </Badge>
          }
          icon={Apple}
          title="Nutritional Analysis"
        >
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded bg-muted/50 p-2 text-center">
              <div className="font-semibold text-lg">
                {optimization.nutritionalAnalysis.perServing.calories}
              </div>
              <div className="text-muted-foreground text-xs">Calories</div>
            </div>
            <div className="rounded bg-muted/50 p-2 text-center">
              <div className="font-semibold text-lg">
                {optimization.nutritionalAnalysis.perServing.protein}g
              </div>
              <div className="text-muted-foreground text-xs">Protein</div>
            </div>
            <div className="rounded bg-muted/50 p-2 text-center">
              <div className="font-semibold text-lg">
                {optimization.nutritionalAnalysis.perServing.carbohydrates}g
              </div>
              <div className="text-muted-foreground text-xs">Carbs</div>
            </div>
            <div className="rounded bg-muted/50 p-2 text-center">
              <div className="font-semibold text-lg">
                {optimization.nutritionalAnalysis.perServing.fat}g
              </div>
              <div className="text-muted-foreground text-xs">Fat</div>
            </div>
          </div>

          {optimization.nutritionalAnalysis.nutrientHighlights.length > 0 && (
            <div className="mb-3">
              <div className="mb-1 font-medium text-xs">Highlights</div>
              <div className="flex flex-wrap gap-1">
                {optimization.nutritionalAnalysis.nutrientHighlights.map(
                  (highlight, idx) => (
                    <Badge className="text-xs" key={idx} variant="secondary">
                      {highlight}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}

          {optimization.nutritionalAnalysis.concerns.length > 0 && (
            <Alert className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs">Nutritional Concerns</AlertTitle>
              <AlertDescription className="text-xs">
                <ul className="list-inside list-disc">
                  {optimization.nutritionalAnalysis.concerns.map(
                    (concern, idx) => (
                      <li key={idx}>{concern}</li>
                    )
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {optimization.nutritionalAnalysis.improvementSuggestions.length >
            0 && (
            <div className="space-y-2">
              <div className="font-medium text-xs">Improvement Suggestions</div>
              {optimization.nutritionalAnalysis.improvementSuggestions.map(
                (suggestion, idx) => (
                  <div
                    className="flex items-start gap-2 rounded border p-2 text-sm"
                    key={idx}
                  >
                    {suggestion.type === "reduce" ? (
                      <ArrowDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                    ) : suggestion.type === "increase" ? (
                      <ArrowUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <Scale className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {suggestion.type === "reduce" && "Reduce "}
                        {suggestion.type === "increase" && "Increase "}
                        {suggestion.nutrient}: {suggestion.currentValue}
                        {suggestion.type === "reduce" ? " → " : " → "}
                        {suggestion.targetValue}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {suggestion.suggestion}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* Overall Score */}
        <div className="pt-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-sm">
              Overall Optimization Score
            </span>
            <span className="font-semibold text-sm">
              {Math.round(optimization.overallScore)}/100
            </span>
          </div>
          <Progress className="h-2" value={optimization.overallScore} />
          <p className="mt-2 text-muted-foreground text-xs">
            This score combines availability (
            {Math.round(optimization.availabilityScore)}%), quality (
            {Math.round(optimization.qualityScore)}%), and nutritional value (
            {optimization.nutritionalAnalysis.healthScore}%).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
