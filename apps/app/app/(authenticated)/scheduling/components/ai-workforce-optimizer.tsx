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
  CheckCircle2,
  Clock,
  DollarSign,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";

interface OptimizationConstraints {
  maxLaborCost?: number;
  minSkillCoverage?: number;
  maxHoursPerEmployee?: number;
  requireSeniorityBalance?: boolean;
  preferFullAvailability?: boolean;
  allowOvertime?: boolean;
}

interface OptimizedShiftAssignment {
  shiftId: string;
  recommendedEmployeeId: string;
  employeeName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string[];
  estimatedCost: number;
  riskFactors: string[];
}

interface ScheduleOptimizationResult {
  scheduleId: string;
  optimizedAssignments: OptimizedShiftAssignment[];
  summary: {
    totalShifts: number;
    assignedShifts: number;
    unassignedShifts: number;
    totalEstimatedCost: number;
    averageConfidence: number;
    skillCoverage: number;
    seniorityBalance: number;
  };
  warnings: string[];
  appliedStrategies: string[];
}

interface AIWorkforceOptimizerProps {
  scheduleId: string;
  locationId: string;
  startDate: Date;
  endDate: Date;
  onApplyAssignments?: (assignments: OptimizedShiftAssignment[]) => void;
}

export function AIWorkforceOptimizer({
  scheduleId,
  locationId,
  startDate,
  endDate,
  onApplyAssignments,
}: AIWorkforceOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [result, setResult] = useState<ScheduleOptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [constraints, setConstraints] = useState<OptimizationConstraints>({
    minSkillCoverage: 0.8,
    requireSeniorityBalance: true,
    preferFullAvailability: true,
    allowOvertime: false,
  });

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        "/api/staff/workforce-ai/optimize-schedule",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduleId,
            locationId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            constraints,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to optimize schedule");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApply = () => {
    if (result && onApplyAssignments) {
      onApplyAssignments(result.optimizedAssignments);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <CheckCircle2 className="h-4 w-4" />;
      case "medium":
        return <TrendingUp className="h-4 w-4" />;
      case "low":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Workforce Optimizer
          </CardTitle>
          <CardDescription>
            Automatically optimize shift assignments using AI-powered algorithms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Minimum Skill Coverage
              </label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                onChange={(e) =>
                  setConstraints({
                    ...constraints,
                    minSkillCoverage: Number.parseFloat(e.target.value),
                  })
                }
                value={constraints.minSkillCoverage ?? 0.8}
              >
                <option value={1}>100% (All required skills)</option>
                <option value={0.8}>80% (Most skills)</option>
                <option value={0.6}>60% (Key skills only)</option>
                <option value={0}>No requirement</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Max Hours Per Employee
              </label>
              <input
                className="w-full px-3 py-2 border rounded-md"
                onChange={(e) =>
                  setConstraints({
                    ...constraints,
                    maxHoursPerEmployee: e.target.value
                      ? Number.parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder="No limit"
                type="number"
                value={constraints.maxHoursPerEmployee ?? ""}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Labor Cost ($)</label>
              <input
                className="w-full px-3 py-2 border rounded-md"
                onChange={(e) =>
                  setConstraints({
                    ...constraints,
                    maxLaborCost: e.target.value
                      ? Number.parseFloat(e.target.value)
                      : undefined,
                  })
                }
                placeholder="No limit"
                type="number"
                value={constraints.maxLaborCost ?? ""}
              />
            </div>

            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={constraints.requireSeniorityBalance ?? false}
                  onChange={(e) =>
                    setConstraints({
                      ...constraints,
                      requireSeniorityBalance: e.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Balance seniority
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  checked={constraints.allowOvertime ?? false}
                  onChange={(e) =>
                    setConstraints({
                      ...constraints,
                      allowOvertime: e.target.checked,
                    })
                  }
                  type="checkbox"
                />
                Allow overtime
              </label>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={isOptimizing}
            onClick={handleOptimize}
            size="lg"
          >
            {isOptimizing ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Optimizing Schedule...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Run AI Optimization
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Optimization Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">
                    {result.summary.assignedShifts}
                  </div>
                  <div className="text-sm text-gray-600">Shifts Assigned</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">
                    {Math.round(result.summary.averageConfidence)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Confidence</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">
                    ${result.summary.totalEstimatedCost.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">Est. Cost</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold">
                    {Math.round(result.summary.skillCoverage * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Skill Coverage</div>
                </div>
              </div>

              {/* Strategies Applied */}
              {result.appliedStrategies.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">
                    Strategies Applied:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.appliedStrategies.map((strategy) => (
                      <Badge key={strategy} variant="secondary">
                        {strategy.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-800">
                        Warnings:
                      </div>
                      <ul className="mt-1 list-disc list-inside text-yellow-700">
                        {result.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <div className="mt-4 flex gap-2">
                <Button
                  disabled={result.optimizedAssignments.length === 0}
                  onClick={handleApply}
                >
                  Apply All Assignments
                </Button>
                <Button onClick={() => setResult(null)} variant="outline">
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assignments Detail */}
          {result.optimizedAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommended Assignments</CardTitle>
                <CardDescription>
                  Review and apply AI-generated shift assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {result.optimizedAssignments.map((assignment) => (
                    <div
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      key={assignment.shiftId}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {assignment.employeeName}
                            </span>
                            <Badge
                              className={getConfidenceColor(
                                assignment.confidence
                              )}
                              variant="outline"
                            >
                              <span className="flex items-center gap-1">
                                {getConfidenceIcon(assignment.confidence)}
                                {assignment.confidence} confidence
                              </span>
                            </Badge>
                          </div>
                          <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                            {assignment.reasoning.map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                          {assignment.riskFactors.length > 0 && (
                            <div className="mt-2 text-sm text-yellow-600">
                              <span className="font-medium">Risks:</span>{" "}
                              {assignment.riskFactors.join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Est. Cost</div>
                          <div className="font-medium">
                            ${assignment.estimatedCost.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
