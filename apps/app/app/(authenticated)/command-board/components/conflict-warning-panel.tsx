"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useState } from "react";
import type {
  Conflict,
  ConflictSeverity,
  ConflictType,
} from "../conflict-types";

interface ConflictWarningPanelProps {
  conflicts: Conflict[];
  onClose?: () => void;
}

const severityConfig = {
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle,
  },
  high: {
    label: "High",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: AlertCircle,
  },
  low: {
    label: "Low",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Info,
  },
} as const satisfies Record<ConflictSeverity, unknown>;

const typeConfig = {
  scheduling: {
    label: "Scheduling",
    color: "bg-purple-100 text-purple-700",
  },
  resource: {
    label: "Resource",
    color: "bg-amber-100 text-amber-700",
  },
  staff: {
    label: "Staff",
    color: "bg-green-100 text-green-700",
  },
  inventory: {
    label: "Inventory",
    color: "bg-pink-100 text-pink-700",
  },
  timeline: {
    label: "Timeline",
    color: "bg-cyan-100 text-cyan-700",
  },
} as const satisfies Record<ConflictType, unknown>;

export function ConflictWarningPanel({
  conflicts,
  onClose,
}: ConflictWarningPanelProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set()
  );

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedConflicts);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedConflicts(newExpanded);
  };

  if (conflicts.length === 0) {
    return null;
  }

  const criticalConflicts = conflicts.filter(
    (c) => c.severity === "critical"
  ).length;

  return (
    <div className="absolute top-4 right-4 z-50 flex max-w-md flex-col gap-2">
      {criticalConflicts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {criticalConflicts} critical conflict
            {criticalConflicts === 1 ? "" : "s"}
          </AlertTitle>
        </Alert>
      )}
      <div className="max-h-96 overflow-y-auto rounded-md border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-semibold">
              {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}{" "}
              detected
            </span>
          </div>
          {onClose && (
            <Button
              className="h-8 w-8 p-0"
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-2 p-3">
          {conflicts.map((conflict) => {
            const severity = severityConfig[conflict.severity] as {
              label: string;
              color: string;
              icon: typeof AlertTriangle;
            };
            const type = typeConfig[conflict.type] as {
              label: string;
              color: string;
            };
            const SeverityIcon = severity.icon;
            const isExpanded = expandedConflicts.has(conflict.id);

            return (
              <Alert
                className="cursor-pointer transition-colors hover:bg-muted/50"
                key={conflict.id}
                onClick={() => toggleExpand(conflict.id)}
              >
                <div className="flex items-start gap-3">
                  <SeverityIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={severity.color} variant="outline">
                        {severity.label}
                      </Badge>
                      <Badge className={type.color} variant="outline">
                        {type.label}
                      </Badge>
                    </div>
                    <AlertTitle className="text-sm">
                      {conflict.title}
                    </AlertTitle>
                    {isExpanded && (
                      <>
                        <AlertDescription className="text-sm">
                          {conflict.description}
                        </AlertDescription>
                        {conflict.suggestedAction && (
                          <div className="mt-2 rounded-md border-l-4 border-l-blue-500 bg-blue-50 p-2 text-sm">
                            <p className="font-medium text-blue-900">
                              💡 Suggested action:
                            </p>
                            <p className="text-blue-800">
                              {conflict.suggestedAction}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 rounded-md bg-muted p-2">
                          <p className="mb-1 font-semibold text-muted-foreground text-xs uppercase">
                            Affected entities
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {conflict.affectedEntities.map((entity) => (
                              <Badge
                                className="text-xs"
                                key={entity.id}
                                variant="secondary"
                              >
                                {entity.type}: {entity.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Alert>
            );
          })}
        </div>
      </div>
    </div>
  );
}
