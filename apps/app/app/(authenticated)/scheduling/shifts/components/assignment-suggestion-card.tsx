"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertTriangleIcon,
  CheckIcon,
  ClockIcon,
  DollarSignIcon,
  StarIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import {
  type AssignmentSuggestion,
  formatEmployeeName,
  formatScore,
  getConfidenceColor,
  getConfidenceIcon,
  getConfidenceLabel,
  getScoreBarColor,
  getScoreBarWidth,
  getScoreColor,
} from "../../../../lib/assignment";

interface AssignmentSuggestionCardProps {
  isBestMatch?: boolean;
  onSelect?: () => void;
  selected?: boolean;
  suggestion: AssignmentSuggestion;
}

export function AssignmentSuggestionCard({
  suggestion,
  isBestMatch = false,
  onSelect,
  selected = false,
}: AssignmentSuggestionCardProps) {
  const { employee, score, reasoning, confidence, matchDetails } = suggestion;

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/40 ${
        selected ? "ring-2 ring-primary" : ""
      } ${isBestMatch ? "border-2 border-green-500" : ""}`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                {formatEmployeeName(employee)}
              </CardTitle>
              {isBestMatch && (
                <Badge className="border-green-200 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  Best Match
                </Badge>
              )}
              <Badge className={getConfidenceColor(confidence)}>
                {getConfidenceIcon(confidence)} {getConfidenceLabel(confidence)}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {employee.role}
              </span>
              {employee.email && (
                <span className="text-xs">{employee.email}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-bold text-2xl ${getScoreColor(score)}`}>
              {formatScore(score)}
            </div>
            <div className="text-muted-foreground text-xs">out of 100</div>
          </div>
        </div>
        {/* Score Bar */}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50 dark:bg-gray-700">
          <div
            className={`h-full ${getScoreBarColor(score)} transition-all duration-300`}
            style={{ width: getScoreBarWidth(score) }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Match Details */}
        <div className="grid grid-cols-2 gap-3">
          {/* Skills */}
          <div className="space-y-1">
            <div className="font-medium text-muted-foreground text-xs">
              Skills
            </div>
            {matchDetails.skillsMatch ? (
              <div className="flex items-center gap-1 text-sm">
                <CheckIcon className="h-4 w-4 text-green-600" />
                <span className="text-green-700 dark:text-green-300">
                  {matchDetails.skillsMatched.length} matched
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm">
                <XIcon className="h-4 w-4 text-red-600" />
                <span className="text-red-700 dark:text-red-300">
                  {matchDetails.skillsMissing.length} missing
                </span>
              </div>
            )}
            {matchDetails.skillsMatched.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {matchDetails.skillsMatched.map((skill) => (
                  <Badge className="text-xs" key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            {matchDetails.skillsMissing.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {matchDetails.skillsMissing.map((skill) => (
                  <Badge className="text-xs" key={skill} variant="destructive">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Seniority */}
          {employee.seniority && (
            <div className="space-y-1">
              <div className="font-medium text-muted-foreground text-xs">
                Seniority
              </div>
              <div className="flex items-center gap-1 text-sm">
                <StarIcon className="h-4 w-4 text-yellow-600" />
                <span className="font-medium capitalize">
                  {employee.seniority.level}
                </span>
                <span className="text-muted-foreground">
                  (rank {employee.seniority.rank})
                </span>
              </div>
              <div className="text-muted-foreground text-xs">
                +{matchDetails.seniorityScore} points
              </div>
            </div>
          )}
        </div>

        {/* Availability & Cost */}
        <div className="grid grid-cols-2 gap-3">
          {/* Availability */}
          <div className="space-y-1">
            <div className="font-medium text-muted-foreground text-xs">
              Availability
            </div>
            {matchDetails.availabilityMatch ? (
              <div className="flex items-center gap-1 text-green-700 text-sm dark:text-green-300">
                <CheckIcon className="h-4 w-4" />
                Available
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <ClockIcon className="h-4 w-4" />
                No explicit availability
              </div>
            )}
          </div>

          {/* Cost Estimate */}
          <div className="space-y-1">
            <div className="font-medium text-muted-foreground text-xs">
              Cost Estimate
            </div>
            <div className="flex items-center gap-1 text-sm">
              <DollarSignIcon className="h-4 w-4" />
              <span className="font-medium">
                ${matchDetails.costEstimate.toFixed(2)}
              </span>
              {employee.hourlyRate && (
                <span className="text-muted-foreground">
                  (${employee.hourlyRate}/hr)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Conflicts Warning */}
        {matchDetails.hasConflicts && employee.conflictingShifts.length > 0 && (
          <Alert className="py-2" variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <div className="font-medium">Scheduling Conflict</div>
              <div className="mt-1 text-xs">
                {employee.conflictingShifts.length} conflicting shift
                {employee.conflictingShifts.length > 1 ? "s" : ""}:
                <ul className="mt-1 list-inside list-disc space-y-1">
                  {employee.conflictingShifts.slice(0, 2).map((conflict) => (
                    <li key={conflict.id}>
                      {new Date(conflict.shiftStart).toLocaleDateString()} at{" "}
                      {conflict.locationName}
                    </li>
                  ))}
                  {employee.conflictingShifts.length > 2 && (
                    <li>+{employee.conflictingShifts.length - 2} more</li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Reasoning */}
        {reasoning.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="font-medium text-muted-foreground text-xs">
                Why This Match?
              </div>
              <ul className="space-y-1">
                {reasoning.map((reason, idx) => (
                  <li className="flex items-start gap-2 text-sm" key={idx}>
                    <span className="text-muted-foreground">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
