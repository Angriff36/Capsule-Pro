"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface AllergenConflict {
  guestId: string;
  guestName: string;
  dishId: string;
  dishName: string;
  allergens: string[];
  severity: "critical" | "warning";
  type: "allergen_conflict" | "dietary_conflict";
}

interface AllergenWarning {
  id: string;
  eventId: string;
  dishId: string | null;
  warningType: string;
  allergens: string[];
  affectedGuests: string[];
  severity: string;
  isAcknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

interface AllergenSectionProps {
  eventId: string;
}

export function AllergenSection({ eventId }: AllergenSectionProps) {
  const [conflicts, setConflicts] = useState<AllergenConflict[]>([]);
  const [conflictSummary, setConflictSummary] = useState({
    total: 0,
    critical: 0,
    warning: 0,
  });
  const [warnings, setWarnings] = useState<AllergenWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [expandedConflicts, setExpandedConflicts] = useState(true);
  const [expandedWarnings, setExpandedWarnings] = useState(true);

  const fetchWarnings = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/events/${eventId}/warnings`);
      if (res.ok) {
        const data = await res.json();
        setWarnings(Array.isArray(data) ? data : (data.warnings ?? []));
      }
    } catch {
      // Warnings fetch is best-effort
    }
  }, [eventId]);

  const runAllergenCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await apiFetch("/api/events/allergens/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) {
        const data = await res.json();
        setConflicts(data.conflicts ?? []);
        setConflictSummary(
          data.summary ?? { total: 0, critical: 0, warning: 0 }
        );
      }
    } catch {
      toast.error("Failed to run allergen check");
    } finally {
      setIsChecking(false);
    }
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([runAllergenCheck(), fetchWarnings()]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [runAllergenCheck, fetchWarnings]);

  const acknowledgeWarning = async (warningId: string) => {
    try {
      const res = await apiFetch("/api/events/allergens/warnings/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warningId }),
      });
      if (res.ok) {
        toast.success("Warning acknowledged");
        await fetchWarnings();
      } else {
        toast.error("Failed to acknowledge warning");
      }
    } catch {
      toast.error("Failed to acknowledge warning");
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Loading allergen data...
        </h3>
      </div>
    );
  }

  const unacknowledgedWarnings = warnings.filter((w) => !w.isAcknowledged);
  const acknowledgedWarnings = warnings.filter((w) => w.isAcknowledged);

  return (
    <div className="space-y-4">
      {/* Conflict Summary */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Allergen & Dietary Check</h3>
          </div>
          <button
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
            disabled={isChecking}
            onClick={runAllergenCheck}
            type="button"
          >
            {isChecking ? "Checking..." : "Re-check"}
          </button>
        </div>

        {conflictSummary.total === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm text-success">
              No allergen or dietary conflicts detected
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-destructive/10 p-2 text-center">
              <p className="text-lg font-bold text-destructive">
                {conflictSummary.critical}
              </p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-2 text-center">
              <p className="text-lg font-bold text-warning">
                {conflictSummary.warning}
              </p>
              <p className="text-xs text-muted-foreground">Dietary</p>
            </div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <p className="text-lg font-bold">{conflictSummary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        )}

        {conflicts.length > 0 && (
          <div>
            <button
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setExpandedConflicts(!expandedConflicts)}
              type="button"
            >
              <span>Conflicts ({conflicts.length})</span>
              {expandedConflicts ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {expandedConflicts && (
              <div className="mt-2 space-y-2">
                {conflicts.map((conflict, idx) => (
                  <div
                    className={`rounded-lg border p-2.5 text-sm ${
                      conflict.severity === "critical"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-warning/30 bg-warning/5"
                    }`}
                    key={`${conflict.guestId}-${conflict.dishId}-${idx}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {conflict.guestName}{" "}
                          <span className="text-muted-foreground">←</span>{" "}
                          {conflict.dishName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {conflict.allergens.map((a) => (
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                conflict.severity === "critical"
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-warning/15 text-warning"
                              }`}
                              key={a}
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          conflict.type === "allergen_conflict"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {conflict.type === "allergen_conflict"
                          ? "Allergen"
                          : "Dietary"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setExpandedWarnings(!expandedWarnings)}
            type="button"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold">
                Warnings ({unacknowledgedWarnings.length} active,{" "}
                {acknowledgedWarnings.length} acknowledged)
              </h3>
            </div>
            {expandedWarnings ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {expandedWarnings && (
            <div className="space-y-2">
              {unacknowledgedWarnings.map((w) => (
                <div
                  className="rounded-lg border border-warning/30 bg-warning/5 p-2.5"
                  key={w.id}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{w.warningType}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {w.allergens?.join(", ")} —{" "}
                        {w.affectedGuests?.length ?? 0} guest(s) affected
                      </p>
                    </div>
                    <button
                      className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
                      onClick={() => acknowledgeWarning(w.id)}
                      type="button"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
              {acknowledgedWarnings.map((w) => (
                <div
                  className="rounded-lg border border-border bg-muted/50 p-2.5 opacity-60"
                  key={w.id}
                >
                  <div className="flex items-start justify-between text-sm">
                    <div>
                      <p className="font-medium">{w.warningType}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        Acknowledged{" "}
                        {w.acknowledgedAt
                          ? new Date(w.acknowledgedAt).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
