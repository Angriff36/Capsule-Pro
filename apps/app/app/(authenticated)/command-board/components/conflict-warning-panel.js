"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictWarningPanel = ConflictWarningPanel;
const alert_1 = require("@repo/design-system/components/ui/alert");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const severityConfig = {
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: lucide_react_1.AlertTriangle,
  },
  high: {
    label: "High",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: lucide_react_1.AlertTriangle,
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: lucide_react_1.AlertCircle,
  },
  low: {
    label: "Low",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: lucide_react_1.Info,
  },
};
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
};
function ConflictWarningPanel({ conflicts, onClose }) {
  const [expandedConflicts, setExpandedConflicts] = (0, react_1.useState)(
    new Set()
  );
  const toggleExpand = (id) => {
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
        <alert_1.Alert variant="destructive">
          <lucide_react_1.AlertTriangle className="h-4 w-4" />
          <alert_1.AlertTitle>
            {criticalConflicts} critical conflict
            {criticalConflicts === 1 ? "" : "s"}
          </alert_1.AlertTitle>
        </alert_1.Alert>
      )}
      <div className="max-h-96 overflow-y-auto rounded-md border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <lucide_react_1.AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-semibold">
              {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}{" "}
              detected
            </span>
          </div>
          {onClose && (
            <button_1.Button
              className="h-8 w-8 p-0"
              onClick={onClose}
              size="sm"
              variant="ghost"
            >
              <lucide_react_1.X className="h-4 w-4" />
            </button_1.Button>
          )}
        </div>
        <div className="flex flex-col gap-2 p-3">
          {conflicts.map((conflict) => {
            const severity = severityConfig[conflict.severity];
            const type = typeConfig[conflict.type];
            const SeverityIcon = severity.icon;
            const isExpanded = expandedConflicts.has(conflict.id);
            return (
              <alert_1.Alert
                className="cursor-pointer transition-colors hover:bg-muted/50"
                key={conflict.id}
                onClick={() => toggleExpand(conflict.id)}
              >
                <div className="flex items-start gap-3">
                  <SeverityIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <badge_1.Badge
                        className={severity.color}
                        variant="outline"
                      >
                        {severity.label}
                      </badge_1.Badge>
                      <badge_1.Badge className={type.color} variant="outline">
                        {type.label}
                      </badge_1.Badge>
                    </div>
                    <alert_1.AlertTitle className="text-sm">
                      {conflict.title}
                    </alert_1.AlertTitle>
                    {isExpanded && (
                      <>
                        <alert_1.AlertDescription className="text-sm">
                          {conflict.description}
                        </alert_1.AlertDescription>
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
                              <badge_1.Badge
                                className="text-xs"
                                key={entity.id}
                                variant="secondary"
                              >
                                {entity.type}: {entity.name}
                              </badge_1.Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </alert_1.Alert>
            );
          })}
        </div>
      </div>
    </div>
  );
}
