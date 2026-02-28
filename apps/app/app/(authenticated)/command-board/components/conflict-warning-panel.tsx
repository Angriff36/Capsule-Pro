"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { detectConflicts } from "../actions/conflicts";
import type {
  Conflict,
  ConflictSeverity,
  ConflictType,
  DetectorWarning,
} from "../conflict-types";

interface ConflictWarningPanelProps {
  conflicts: Conflict[];
  /** Warnings from individual detectors that partially failed */
  detectorWarnings?: DetectorWarning[];
  errorMessage?: string | null;
  onClose?: () => void;
  /** When provided, shows simulation-specific conflicts and delta */
  simulationBoardId?: string;
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
  equipment: {
    label: "Equipment",
    color: "bg-indigo-100 text-indigo-700",
  },
  timeline: {
    label: "Timeline",
    color: "bg-cyan-100 text-cyan-700",
  },
  venue: {
    label: "Venue",
    color: "bg-lime-100 text-lime-700",
  },
  financial: {
    label: "Financial",
    color: "bg-yellow-100 text-yellow-700",
  },
} as const satisfies Record<ConflictType, unknown>;

// Helper to get panel title based on state
function getPanelTitle(
  isLoading: boolean,
  hasError: boolean,
  isSimulation: boolean,
  conflictCount: number
): string {
  if (isLoading) {
    return "Analyzing simulation...";
  }
  if (hasError) {
    return "Conflict check failed";
  }
  const plural = conflictCount === 1 ? "" : "s";
  if (isSimulation) {
    return `Simulation: ${conflictCount} conflict${plural}`;
  }
  return `${conflictCount} conflict${plural} detected`;
}

// Hook to manage simulation conflict fetching
function useSimulationConflicts(simulationBoardId?: string) {
  const [simulationConflicts, setSimulationConflicts] = useState<Conflict[]>(
    []
  );
  const [simulationWarnings, setSimulationWarnings] = useState<
    DetectorWarning[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!simulationBoardId) {
      setSimulationConflicts([]);
      setSimulationWarnings([]);
      return;
    }

    const fetchSimulationConflicts = async () => {
      setIsLoading(true);
      try {
        const result = await detectConflicts({ boardId: simulationBoardId });
        setSimulationConflicts(result.conflicts);
        setSimulationWarnings(result.warnings ?? []);
      } catch (error) {
        console.error("Failed to fetch simulation conflicts:", error);
        setSimulationConflicts([]);
        setSimulationWarnings([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimulationConflicts();
  }, [simulationBoardId]);

  return { simulationConflicts, simulationWarnings, isLoading };
}

// Sub-component for rendering a single conflict item
function ConflictItem({
  conflict,
  isExpanded,
  isNewInSimulation,
  onToggle,
}: {
  conflict: Conflict;
  isExpanded: boolean;
  isNewInSimulation: boolean;
  onToggle: () => void;
}) {
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

  return (
    <Alert
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${isNewInSimulation ? "border-l-4 border-l-red-500" : ""}`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <SeverityIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={severity.color} variant="outline">
              {severity.label}
            </Badge>
            <Badge className={type.color} variant="outline">
              {type.label}
            </Badge>
            {isNewInSimulation && (
              <Badge className="bg-red-100 text-red-700" variant="outline">
                New in simulation
              </Badge>
            )}
          </div>
          <AlertTitle className="text-sm">{conflict.title}</AlertTitle>
          {isExpanded && (
            <>
              <AlertDescription className="text-sm">
                {conflict.description}
              </AlertDescription>
              {conflict.suggestedAction && (
                <div className="mt-2 rounded-md border-l-4 border-l-blue-500 bg-blue-50 p-2 text-sm">
                  <p className="font-medium text-blue-900">Suggested action:</p>
                  <p className="text-blue-800">{conflict.suggestedAction}</p>
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
}

// Sub-component for simulation delta display
function SimulationDeltaAlert({
  newCount,
  resolvedCount,
  totalCount,
}: {
  newCount: number;
  resolvedCount: number;
  totalCount: number;
}) {
  return (
    <Alert className="border-blue-500 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">Simulation Analysis</AlertTitle>
      <AlertDescription className="text-blue-800">
        {newCount > 0 && (
          <span className="font-medium text-red-700">
            Introduces {newCount} new conflict{newCount === 1 ? "" : "s"}
          </span>
        )}
        {newCount > 0 && resolvedCount > 0 && <span> • </span>}
        {resolvedCount > 0 && (
          <span className="font-medium text-green-700">
            Resolves {resolvedCount} conflict{resolvedCount === 1 ? "" : "s"}
          </span>
        )}
        {newCount === 0 && resolvedCount === 0 && totalCount === 0 && (
          <span>No conflict changes detected</span>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Sub-component for conflict list
function ConflictList({
  conflicts,
  expandedConflicts,
  newConflictIds,
  onToggle,
}: {
  conflicts: Conflict[];
  expandedConflicts: Set<string>;
  newConflictIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {conflicts.map((conflict) => (
        <ConflictItem
          conflict={conflict}
          isExpanded={expandedConflicts.has(conflict.id)}
          isNewInSimulation={newConflictIds.has(conflict.id)}
          key={conflict.id}
          onToggle={() => onToggle(conflict.id)}
        />
      ))}
    </>
  );
}

export function ConflictWarningPanel({
  conflicts: liveConflicts,
  detectorWarnings: liveDetectorWarnings = [],
  errorMessage,
  onClose,
  simulationBoardId,
}: ConflictWarningPanelProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(
    new Set()
  );
  const {
    simulationConflicts,
    simulationWarnings,
    isLoading: isLoadingSimulation,
  } = useSimulationConflicts(simulationBoardId);

  const toggleExpand = (id: string) => {
    setExpandedConflicts((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  // When in simulation mode, show simulation conflicts; otherwise show live conflicts
  const conflicts = simulationBoardId ? simulationConflicts : liveConflicts;

  // Use appropriate warnings based on mode
  const activeDetectorWarnings = simulationBoardId
    ? simulationWarnings
    : liveDetectorWarnings;

  // Compute delta between live and simulation
  const liveConflictIds = new Set(liveConflicts.map((c) => c.id));
  const simulationConflictIds = new Set(simulationConflicts.map((c) => c.id));

  const newConflictsInSimulation = simulationBoardId
    ? simulationConflicts.filter((c) => !liveConflictIds.has(c.id))
    : [];
  const resolvedInSimulation = simulationBoardId
    ? liveConflicts.filter((c) => !simulationConflictIds.has(c.id))
    : [];

  const criticalConflicts = conflicts.filter(
    (c) => c.severity === "critical"
  ).length;

  // Early returns for empty states
  const hasNoContent =
    conflicts.length === 0 &&
    !errorMessage &&
    !simulationBoardId &&
    activeDetectorWarnings.length === 0;
  const simulationHasNoChanges =
    simulationBoardId &&
    simulationConflicts.length === 0 &&
    !errorMessage &&
    newConflictsInSimulation.length === 0 &&
    resolvedInSimulation.length === 0 &&
    simulationWarnings.length === 0;

  if (hasNoContent || simulationHasNoChanges) {
    return null;
  }

  const panelTitle = getPanelTitle(
    isLoadingSimulation,
    !!errorMessage,
    !!simulationBoardId,
    conflicts.length
  );
  const newConflictIds = new Set(newConflictsInSimulation.map((c) => c.id));

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
      {simulationBoardId && !isLoadingSimulation && (
        <SimulationDeltaAlert
          newCount={newConflictsInSimulation.length}
          resolvedCount={resolvedInSimulation.length}
          totalCount={conflicts.length}
        />
      )}
      <div
        className={`max-h-96 overflow-y-auto rounded-md border bg-background shadow-lg ${simulationBoardId ? "border-blue-500" : ""}`}
      >
        <div
          className={`flex items-center justify-between border-b p-3 ${simulationBoardId ? "bg-blue-100/50" : "bg-muted/50"}`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-5 w-5 ${simulationBoardId ? "text-blue-600" : "text-amber-600"}`}
            />
            <span className="font-semibold">{panelTitle}</span>
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
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {errorMessage === "Unauthorized"
                  ? "Unauthorized"
                  : "Unable to fetch conflicts"}
              </AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          {activeDetectorWarnings.length > 0 && !isLoadingSimulation && (
            <Alert className="border-amber-500 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">
                Partial conflict check
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                <ul className="list-disc pl-4 space-y-1">
                  {activeDetectorWarnings.map((warning, index) => (
                    <li key={`${warning.detectorType}-${index}`}>
                      {warning.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {isLoadingSimulation && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <span>Analyzing simulation conflicts...</span>
            </div>
          )}
          {!isLoadingSimulation && (
            <ConflictList
              conflicts={conflicts}
              expandedConflicts={expandedConflicts}
              newConflictIds={newConflictIds}
              onToggle={toggleExpand}
            />
          )}
          {!isLoadingSimulation && conflicts.length === 0 && !errorMessage && (
            <div className="py-4 text-center text-muted-foreground">
              No conflicts detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
