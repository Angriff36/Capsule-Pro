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
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PerformancePredictionRequest {
  employeeId: string;
  predictionHorizon: number;
  metrics: Array<
    "productivity" | "attendance" | "overtime_risk" | "skill_match"
  >;
}

interface ProductivityPrediction {
  predictedScore: number;
  trend: "improving" | "stable" | "declining";
  factors: Array<{
    factor: string;
    impact: "positive" | "neutral" | "negative";
    weight: number;
  }>;
}

interface AttendancePrediction {
  predictedAttendanceRate: number;
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
}

interface OvertimeRiskPrediction {
  riskLevel: "low" | "medium" | "high";
  projectedOvertimeHours: number;
  contributingFactors: string[];
}

interface SkillMatchPrediction {
  overallMatchScore: number;
  skillGaps: Array<{
    skillName: string;
    currentProficiency: number;
    requiredProficiency: number;
    gap: number;
  }>;
  trainingRecommendations: string[];
}

interface PerformancePredictionResult {
  employeeId: string;
  predictions: {
    productivity: ProductivityPrediction | null;
    attendance: AttendancePrediction | null;
    overtimeRisk: OvertimeRiskPrediction | null;
    skillMatch: SkillMatchPrediction | null;
  };
  overallPerformanceScore: number;
  recommendations: string[];
}

interface PerformancePredictionsProps {
  employeeIds: string[];
  predictionHorizon?: number; // days
}

export function PerformancePredictions({
  employeeIds,
  predictionHorizon = 30,
}: PerformancePredictionsProps) {
  const [predictions, setPredictions] = useState<
    Map<string, PerformancePredictionResult>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<
    "productivity" | "attendance" | "overtime_risk" | "skill_match"
  >("productivity");

  useEffect(() => {
    if (employeeIds.length > 0) {
      fetchPredictions();
    }
  }, [employeeIds, predictionHorizon]);

  const fetchPredictions = async () => {
    setIsLoading(true);
    const results = new Map<string, PerformancePredictionResult>();

    for (const employeeId of employeeIds) {
      try {
        const response = await fetch(
          "/api/staff/workforce-ai/predict-performance",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId,
              predictionHorizon,
              metrics: [
                "productivity",
                "attendance",
                "overtime_risk",
                "skill_match",
              ],
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          results.set(employeeId, data);
        }
      } catch (error) {
        console.error(`Failed to fetch prediction for ${employeeId}:`, error);
      }
    }

    setPredictions(results);
    setIsLoading(false);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const renderMetricContent = (result: PerformancePredictionResult) => {
    switch (selectedMetric) {
      case "productivity": {
        const productivity = result.predictions.productivity;
        if (!productivity)
          return <div className="text-gray-500">No data available</div>;
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Productivity Score</span>
                <span
                  className={`text-2xl font-bold ${getScoreColor(productivity.predictedScore)}`}
                >
                  {productivity.predictedScore}%
                </span>
              </div>
              <Progress className="h-2" value={productivity.predictedScore} />
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(productivity.trend)}
              <span className="text-sm capitalize">
                {productivity.trend} trend
              </span>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Contributing Factors:</div>
              {productivity.factors.map((factor, i) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={i}
                >
                  <span>{factor.factor}</span>
                  <Badge
                    className={
                      factor.impact === "positive"
                        ? "text-green-600 bg-green-50 border-green-200"
                        : factor.impact === "negative"
                          ? "text-red-600 bg-red-50 border-red-200"
                          : "text-gray-600 bg-gray-50 border-gray-200"
                    }
                    variant="outline"
                  >
                    {factor.impact}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "attendance": {
        const attendance = result.predictions.attendance;
        if (!attendance)
          return <div className="text-gray-500">No data available</div>;
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Predicted Attendance
                </span>
                <span className="text-2xl font-bold">
                  {Math.round(attendance.predictedAttendanceRate * 100)}%
                </span>
              </div>
              <Progress
                className="h-2"
                value={attendance.predictedAttendanceRate * 100}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={getRiskColor(attendance.riskLevel)}
                variant="outline"
              >
                {attendance.riskLevel} risk
              </Badge>
              {attendance.riskLevel === "high" && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            {attendance.riskFactors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm font-medium text-red-800 mb-1">
                  Risk Factors:
                </div>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {attendance.riskFactors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      case "overtime_risk": {
        const overtime = result.predictions.overtimeRisk;
        if (!overtime)
          return <div className="text-gray-500">No data available</div>;
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                className={getRiskColor(overtime.riskLevel)}
                variant="outline"
              >
                {overtime.riskLevel} risk
              </Badge>
              <span className="text-sm text-gray-600">
                {overtime.projectedOvertimeHours.toFixed(1)}h projected overtime
              </span>
            </div>
            {overtime.contributingFactors.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  Contributing Factors:
                </div>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {overtime.contributingFactors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      case "skill_match": {
        const skillMatch = result.predictions.skillMatch;
        if (!skillMatch)
          return <div className="text-gray-500">No data available</div>;
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Skill Match Score</span>
                <span
                  className={`text-2xl font-bold ${getScoreColor(skillMatch.overallMatchScore)}`}
                >
                  {skillMatch.overallMatchScore}%
                </span>
              </div>
              <Progress className="h-2" value={skillMatch.overallMatchScore} />
            </div>
            {skillMatch.skillGaps.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Skill Gaps:</div>
                <div className="space-y-2">
                  {skillMatch.skillGaps.map((gap, i) => (
                    <div
                      className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                      key={i}
                    >
                      <span>{gap.skillName}</span>
                      <span className="text-red-600">
                        Level {gap.currentProficiency} →{" "}
                        {gap.requiredProficiency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {skillMatch.trainingRecommendations.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-medium text-blue-800 mb-1">
                  Training Recommendations:
                </div>
                <ul className="text-sm text-blue-700 list-disc list-inside">
                  {skillMatch.trainingRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Performance Predictions
        </CardTitle>
        <CardDescription>
          Predictive analytics for employee performance over the next{" "}
          {predictionHorizon} days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setSelectedMetric("productivity")}
            size="sm"
            variant={selectedMetric === "productivity" ? "default" : "outline"}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Productivity
          </Button>
          <Button
            onClick={() => setSelectedMetric("attendance")}
            size="sm"
            variant={selectedMetric === "attendance" ? "default" : "outline"}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Attendance
          </Button>
          <Button
            onClick={() => setSelectedMetric("overtime_risk")}
            size="sm"
            variant={selectedMetric === "overtime_risk" ? "default" : "outline"}
          >
            <Clock className="h-4 w-4 mr-1" />
            Overtime Risk
          </Button>
          <Button
            onClick={() => setSelectedMetric("skill_match")}
            size="sm"
            variant={selectedMetric === "skill_match" ? "default" : "outline"}
          >
            <Brain className="h-4 w-4 mr-1" />
            Skill Match
          </Button>
          <Button
            disabled={isLoading}
            onClick={fetchPredictions}
            size="sm"
            variant="ghost"
          >
            Refresh
          </Button>
        </div>

        {/* Predictions Display */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            Loading predictions...
          </div>
        ) : predictions.size === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No predictions available. Select employees to generate predictions.
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(predictions.entries()).map(([employeeId, result]) => (
              <div className="p-4 border rounded-lg space-y-3" key={employeeId}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      Employee {employeeId.slice(-6)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Overall Score:{" "}
                      <span
                        className={`font-semibold ${getScoreColor(result.overallPerformanceScore)}`}
                      >
                        {result.overallPerformanceScore}/100
                      </span>
                    </div>
                  </div>
                </div>

                {renderMetricContent(result)}

                {result.recommendations.length > 0 && (
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium mb-1">
                      AI Recommendations:
                    </div>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {result.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
