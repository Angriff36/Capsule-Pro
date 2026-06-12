/**
 * @module ConflictsClient
 * @intent Client-side UI for conflict detection across employees, equipment, inventory, and venues
 * @responsibility Render detected conflicts with severity badges, resolution options, and filtering
 * @domain Tools
 * @tags conflicts, detection, scheduling, equipment, inventory, venue
 * @canonical true
 */

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  ShieldAlert,
  Users,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for conflict detection endpoint (/api/conflicts/detect) — no generated client for conflict detection
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types — mirror backend types from conflicts/detect/types.ts
// ---------------------------------------------------------------------------

type ConflictSeverity = "low" | "medium" | "high" | "critical";

type ConflictType =
  | "scheduling"
  | "resource"
  | "staff"
  | "inventory"
  | "equipment"
  | "timeline"
  | "venue"
  | "financial";

interface AffectedEntity {
  id: string;
  name: string;
  type: "event" | "task" | "employee" | "inventory" | "equipment" | "venue";
}

interface ResolutionOption {
  affectedEntities: AffectedEntity[];
  description: string;
  estimatedImpact: "low" | "medium" | "high";
  type: "reassign" | "reschedule" | "substitute" | "cancel" | "split";
}

interface Conflict {
  affectedEntities: AffectedEntity[];
  createdAt: string;
  description: string;
  id: string;
  resolutionOptions?: ResolutionOption[];
  severity: ConflictSeverity;
  suggestedAction?: string;
  title: string;
  type: ConflictType;
}

interface ConflictSummary {
  bySeverity: Record<ConflictSeverity, number>;
  byType: Record<ConflictType, number>;
  total: number;
}

interface ConflictDetectionResult {
  analyzedAt: string;
  conflicts: Conflict[];
  summary: ConflictSummary;
  warnings?: { detectorType: ConflictType; message: string }[];
}

// ---------------------------------------------------------------------------
// Tab definitions — map UI tabs to conflict types
// ---------------------------------------------------------------------------

type ConflictTab = "all" | "employee" | "equipment" | "inventory" | "venue";

const TAB_CONFIG: {
  value: ConflictTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  types: ConflictType[];
}[] = [
  {
    value: "all",
    label: "All Conflicts",
    icon: ShieldAlert,
    types: ["scheduling", "staff", "equipment", "inventory", "venue"],
  },
  {
    value: "employee",
    label: "Employee",
    icon: Users,
    types: ["scheduling", "staff"],
  },
  {
    value: "equipment",
    label: "Equipment",
    icon: Wrench,
    types: ["equipment"],
  },
  {
    value: "inventory",
    label: "Inventory",
    icon: Package,
    types: ["inventory"],
  },
  {
    value: "venue",
    label: "Venue",
    icon: MapPin,
    types: ["venue"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityVariant(
  severity: ConflictSeverity
): "destructive" | "default" | "secondary" | "outline" {
  switch (severity) {
    case "critical":
      return "destructive";
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
  }
}

function severityIcon(severity: ConflictSeverity) {
  switch (severity) {
    case "critical":
      return <XCircle className="h-3.5 w-3.5" />;
    case "high":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "medium":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "low":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
}

function severityColor(severity: ConflictSeverity): string {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "high":
      return "text-orange-600";
    case "medium":
      return "text-yellow-600";
    case "low":
      return "text-green-600";
  }
}

function entityIcon(type: AffectedEntity["type"]) {
  switch (type) {
    case "employee":
      return <Users className="h-3.5 w-3.5" />;
    case "equipment":
      return <Wrench className="h-3.5 w-3.5" />;
    case "inventory":
      return <Package className="h-3.5 w-3.5" />;
    case "venue":
      return <MapPin className="h-3.5 w-3.5" />;
    case "event":
      return <Calendar className="h-3.5 w-3.5" />;
    case "task":
      return <Clock className="h-3.5 w-3.5" />;
  }
}

function impactVariant(
  impact: ResolutionOption["estimatedImpact"]
): "destructive" | "default" | "secondary" | "outline" {
  switch (impact) {
    case "high":
      return "destructive";
    case "medium":
      return "default";
    case "low":
      return "secondary";
  }
}

function typeLabel(type: ConflictType): string {
  switch (type) {
    case "scheduling":
      return "Scheduling";
    case "staff":
      return "Staff";
    case "equipment":
      return "Equipment";
    case "inventory":
      return "Inventory";
    case "venue":
      return "Venue";
    case "timeline":
      return "Timeline";
    case "financial":
      return "Financial";
    case "resource":
      return "Resource";
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
        </div>
        <div>
          <p className="font-bold text-2xl leading-none">{value}</p>
          <p className="text-muted-foreground text-sm">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Conflict Card
// ---------------------------------------------------------------------------

function ConflictCard({ conflict }: { conflict: Conflict }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const hasResolutions =
    conflict.resolutionOptions && conflict.resolutionOptions.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{conflict.title}</CardTitle>
            <CardDescription className="mt-1">
              {conflict.description}
            </CardDescription>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-1.5">
            <Badge
              className="gap-1"
              variant={severityVariant(conflict.severity)}
            >
              {severityIcon(conflict.severity)}
              {conflict.severity}
            </Badge>
            <Badge variant="outline">{typeLabel(conflict.type)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Affected entities */}
        <div className="flex flex-wrap gap-2">
          {conflict.affectedEntities.map((entity) => (
            <Badge
              className="gap-1"
              key={`${entity.type}-${entity.id}`}
              variant="secondary"
            >
              {entityIcon(entity.type)}
              {entity.name}
            </Badge>
          ))}
        </div>

        {/* Suggested action */}
        {conflict.suggestedAction && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-muted-foreground text-sm">
              {conflict.suggestedAction}
            </p>
          </div>
        )}

        {/* Resolution options */}
        {hasResolutions && (
          <Collapsible onOpenChange={setExpanded} open={expanded}>
            <CollapsibleTrigger asChild>
              <Button className="gap-1.5" size="sm" variant="ghost">
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
                {expanded ? "Hide" : "Show"} Resolution Options (
                {conflict.resolutionOptions!.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {conflict.resolutionOptions!.map((option, i) => (
                <div className="rounded-md border p-3" key={i}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {option.description}
                      </span>
                    </div>
                    <Badge variant={impactVariant(option.estimatedImpact)}>
                      {option.estimatedImpact} impact
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-muted-foreground text-xs">
                      Affects:
                    </span>
                    {option.affectedEntities.map((entity) => (
                      <Badge
                        className="gap-1 text-xs"
                        key={`${entity.type}-${entity.id}`}
                        variant="outline"
                      >
                        {entityIcon(entity.type)}
                        {entity.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ConflictsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ConflictTab>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConflictDetectionResult | null>(null);

  const detectConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // next 14 days

      const tabConfig = TAB_CONFIG.find((t) => t.value === activeTab);
      const entityTypes = tabConfig?.types ?? [
        "scheduling",
        "staff",
        "equipment",
        "inventory",
        "venue",
      ];

      const res = await apiFetch("/api/conflicts/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeRange: {
            start: now.toISOString(),
            end: endDate.toISOString(),
          },
          entityTypes,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { message?: string };
        throw new Error(
          errorData.message ?? `Request failed with status ${res.status}`
        );
      }

      const json = (await res.json()) as ConflictDetectionResult;
      setResult(json);
      toast.success(
        `Detection complete: ${json.summary.total} conflict(s) found`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to detect conflicts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const filteredConflicts = useMemo(() => {
    if (!result) {
      return [];
    }
    const tabConfig = TAB_CONFIG.find((t) => t.value === activeTab);
    if (!tabConfig || activeTab === "all") {
      return result.conflicts;
    }
    return result.conflicts.filter((c) => tabConfig.types.includes(c.type));
  }, [result, activeTab]);

  const filteredSummary = useMemo(() => {
    const conflicts = filteredConflicts;
    return {
      total: conflicts.length,
      critical: conflicts.filter((c) => c.severity === "critical").length,
      high: conflicts.filter((c) => c.severity === "high").length,
      medium: conflicts.filter((c) => c.severity === "medium").length,
      low: conflicts.filter((c) => c.severity === "low").length,
    };
  }, [filteredConflicts]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs
        onValueChange={(v) => setActiveTab(v as ConflictTab)}
        value={activeTab}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            {TAB_CONFIG.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <TabsTrigger
                  className="gap-1.5"
                  key={tab.value}
                  value={tab.value}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <Button disabled={loading} onClick={detectConflicts}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Detect Conflicts
          </Button>
        </div>

        {TAB_CONFIG.map((tab) => (
          <TabsContent
            className="mt-6 space-y-6"
            key={tab.value}
            value={tab.value}
          >
            {/* Error */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="flex items-center gap-2 p-4 text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Warnings from detectors */}
            {result?.warnings && result.warnings.length > 0 && (
              <Card className="border-hairline bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground text-sm">
                        Some detectors had issues
                      </p>
                      {result.warnings.map((w, i) => (
                        <p className="text-muted-foreground text-xs" key={i}>
                          {w.message}
                        </p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stat cards */}
            {result && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  icon={ShieldAlert}
                  label="Total"
                  value={filteredSummary.total}
                />
                <StatCard
                  color="text-red-600"
                  icon={XCircle}
                  label="Critical"
                  value={filteredSummary.critical}
                />
                <StatCard
                  color="text-orange-600"
                  icon={AlertTriangle}
                  label="High"
                  value={filteredSummary.high}
                />
                <StatCard
                  color="text-yellow-600"
                  icon={AlertCircle}
                  label="Medium"
                  value={filteredSummary.medium}
                />
                <StatCard
                  color="text-green-600"
                  icon={CheckCircle2}
                  label="Low"
                  value={filteredSummary.low}
                />
              </div>
            )}

            {/* Conflicts list */}
            {filteredConflicts.length > 0 && (
              <div className="space-y-4">
                {filteredConflicts.map((conflict) => (
                  <ConflictCard conflict={conflict} key={conflict.id} />
                ))}
              </div>
            )}

            {/* Empty after detection */}
            {result && filteredConflicts.length === 0 && !loading && (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-12">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="font-medium text-green-700 text-sm">
                    No{" "}
                    {tab.value === "all" ? "" : tab.label.toLowerCase() + " "}
                    conflicts detected
                  </p>
                  <p className="text-muted-foreground text-sm">
                    All clear for the next 14 days. Run detection again after
                    making schedule changes.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Initial empty state */}
            {!(result || loading || error) && (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-16">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <ShieldAlert className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-2 font-medium text-sm">
                    No conflicts analyzed yet
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Click &quot;Detect Conflicts&quot; to scan for scheduling,
                    equipment, inventory, and venue conflicts across your
                    operations.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Analyzed timestamp */}
            {result?.analyzedAt && (
              <p className="text-center text-muted-foreground text-xs">
                Analyzed at {new Date(result.analyzedAt).toLocaleString()}
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
