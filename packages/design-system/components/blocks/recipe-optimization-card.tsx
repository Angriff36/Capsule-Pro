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
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
}

/**
 * Nutritional improvement suggestion
 */
export interface NutritionalImprovement {
  type: "reduce" | "increase" | "substitute";
  nutrient: string;
  currentValue: number;
  targetValue: number;
  suggestion: string;
  impact: string;
}

/**
 * Nutritional analysis result
 */
export interface NutritionalAnalysis {
  perServing: NutritionalInfo;
  perRecipe: NutritionalInfo;
  healthScore: number;
  nutrientHighlights: string[];
  concerns: string[];
  improvementSuggestions: NutritionalImprovement[];
}

/**
 * Ingredient substitution suggestion
 */
export interface IngredientSubstitution {
  originalIngredientId: string;
  originalIngredientName: string;
  originalQuantity: number;
  originalUnitId: number;
  originalCost: number;
  suggestedIngredientId: string;
  suggestedIngredientName: string;
  suggestedQuantity: number;
  suggestedUnitId: number;
  suggestedCost: number;
  costSavings: number;
  costSavingsPercentage: number;
  reason: string;
  qualityImpact: "positive" | "neutral" | "negative";
  allergenChanges: string[];
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
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialSavings: number;
  potentialSavingsPercentage: number;
  substitutions: IngredientSubstitution[];
  implementation: string;
  risks: string[];
}

/**
 * Prioritized action from AI insights
 */
export interface PrioritizedAction {
  action: string;
  rationale: string;
  expectedOutcome: string;
  effort: "low" | "medium" | "high";
}

/**
 * AI insights for recipe optimization
 */
export interface AIInsights {
  summary: string;
  prioritizedActions: PrioritizedAction[];
  seasonalConsiderations?: string;
  dietaryAlternatives?: string[];
}

/**
 * Full recipe optimization result
 */
export interface RecipeOptimization {
  recipeVersionId: string;
  recipeName: string;
  currentCost: number;
  currentCostPerYield: number;
  optimizedCost: number;
  optimizedCostPerYield: number;
  totalPotentialSavings: number;
  totalPotentialSavingsPercentage: number;
  costOptimizations: CostOptimization[];
  nutritionalAnalysis: NutritionalAnalysis;
  availabilityScore: number;
  qualityScore: number;
  overallScore: number;
  generatedAt: Date | string;
  aiInsights?: AIInsights;
}

/**
 * Props for RecipeOptimizationCard component
 */
export interface RecipeOptimizationCardProps {
  /**
   * The optimization data to display
   */
  optimization: RecipeOptimization;

  /**
   * Optional callback when a substitution is applied
   */
  onApplySubstitution?: (substitution: IngredientSubstitution) => void;

  /**
   * Optional callback when dismissing the card
   */
  onDismiss?: () => void;

  /**
   * Whether to show the AI insights section
   */
  showAIInsights?: boolean;

  /**
   * Optional CSS class
   */
  className?: string;
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
            className="text-muted stroke-current"
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
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}/100</div>
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
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Potential Savings
            </div>
            <div className={`text-lg font-bold ${savingsColor}`}>
              {optimization.totalPotentialSavingsPercentage.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
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
            <p className="text-sm text-muted-foreground mb-4">
              {optimization.aiInsights.summary}
            </p>

            {optimization.aiInsights.prioritizedActions.length > 0 && (
              <div className="space-y-3">
                {optimization.aiInsights.prioritizedActions.map(
                  (action, idx) => (
                    <div className="flex gap-3 p-3 rounded-lg border" key={idx}>
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{action.action}</p>
                          <Badge
                            className={getEffortColor(action.effort)}
                            variant="outline"
                          >
                            {action.effort} effort
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {action.rationale}
                        </p>
                        <p className="text-xs text-green-600">
                          <TrendingDown className="h-3 w-3 inline mr-1" />
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
            <div className="text-center py-6 text-muted-foreground text-sm">
              No cost optimization opportunities identified. Your recipe is
              already optimized!
            </div>
          ) : (
            <div className="space-y-3">
              {optimization.costOptimizations.map((opt, idx) => (
                <div className="p-3 rounded-lg border space-y-2" key={idx}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{opt.title}</h4>
                        <Badge
                          className={getPriorityColor(opt.priority)}
                          variant="outline"
                        >
                          {opt.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {opt.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        -${opt.potentialSavings.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {opt.potentialSavingsPercentage.toFixed(1)}% savings
                      </div>
                    </div>
                  </div>

                  {opt.substitutions.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {opt.substitutions.map((sub, subIdx) => (
                        <div
                          className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                          key={subIdx}
                        >
                          <div className="flex items-center gap-2">
                            <ArrowDown className="h-3 w-3 text-red-500" />
                            <span className="line-through text-muted-foreground">
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
                            <span className="text-green-600 font-semibold">
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
                          <p className="text-xs text-muted-foreground col-span-full mt-1">
                            {sub.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {opt.implementation && (
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
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
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}
              variant="outline"
            >
              Score: {optimization.nutritionalAnalysis.healthScore}/100
            </Badge>
          }
          icon={Apple}
          title="Nutritional Analysis"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-semibold">
                {optimization.nutritionalAnalysis.perServing.calories}
              </div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-semibold">
                {optimization.nutritionalAnalysis.perServing.protein}g
              </div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-semibold">
                {optimization.nutritionalAnalysis.perServing.carbohydrates}g
              </div>
              <div className="text-xs text-muted-foreground">Carbs</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-semibold">
                {optimization.nutritionalAnalysis.perServing.fat}g
              </div>
              <div className="text-xs text-muted-foreground">Fat</div>
            </div>
          </div>

          {optimization.nutritionalAnalysis.nutrientHighlights.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium mb-1">Highlights</div>
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
                <ul className="list-disc list-inside">
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
              <div className="text-xs font-medium">Improvement Suggestions</div>
              {optimization.nutritionalAnalysis.improvementSuggestions.map(
                (suggestion, idx) => (
                  <div
                    className="flex items-start gap-2 p-2 rounded border text-sm"
                    key={idx}
                  >
                    {suggestion.type === "reduce" ? (
                      <ArrowDown className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    ) : suggestion.type === "increase" ? (
                      <ArrowUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Scale className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium">
                        {suggestion.type === "reduce" && "Reduce "}
                        {suggestion.type === "increase" && "Increase "}
                        {suggestion.nutrient}: {suggestion.currentValue}
                        {suggestion.type === "reduce" ? " → " : " → "}
                        {suggestion.targetValue}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Overall Optimization Score
            </span>
            <span className="text-sm font-semibold">
              {Math.round(optimization.overallScore)}/100
            </span>
          </div>
          <Progress className="h-2" value={optimization.overallScore} />
          <p className="text-xs text-muted-foreground mt-2">
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
