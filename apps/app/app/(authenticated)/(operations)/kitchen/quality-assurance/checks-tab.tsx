"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { qACheckComplete } from "@/app/lib/manifest-client.generated";
import { CreateCheckDialog } from "./create-check-dialog";
import {
  qaCheckListTitle,
  qaCheckStatusBadge,
  qaCheckTypeLabels,
} from "./qa-check-catalog";

export interface QACheckListItem {
  checkType: string;
  completedAt: string | null;
  id: string;
  inspector: string;
  location: string;
  notes: string;
  result: string;
  status: string;
}

function CheckStatusIcon({
  result,
  status,
}: {
  result: string;
  status: string;
}) {
  if (status === "completed" && result !== "fail") {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (result === "fail") {
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  }
  return <Clock className="h-4 w-4 text-yellow-500" />;
}

function useRefresh() {
  const router = useRouter();
  return useCallback(() => router.refresh(), [router]);
}

const CHECK_STATUSES = [
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
] as const;

function CompleteCheckDialog({
  checkId,
  onSuccess,
}: {
  checkId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!status) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Complete still uses a legacy payload shape — out of create/list scope.
        const body: Record<string, unknown> = { checkId, status };
        if (notes.trim()) {
          body.notes = notes.trim();
        }
        await qACheckComplete(body);
        toast.success("Check completed");
        setOpen(false);
        onSuccess();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to complete check"
        );
      } finally {
        setLoading(false);
      }
    },
    [checkId, status, notes, onSuccess]
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Complete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Quality Check</DialogTitle>
          <DialogDescription>
            Record results for this quality check.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CHECK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc-notes">Notes</Label>
            <Textarea
              id="cc-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes"
              rows={2}
              value={notes}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button disabled={loading || !status} type="submit">
              {loading ? "Submitting..." : "Complete Check"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChecksTabContent({
  qualityChecks,
}: {
  qualityChecks: QACheckListItem[];
}) {
  const refresh = useRefresh();

  const checkTypeCounts = new Map<string, { total: number; pending: number }>();
  for (const ct of Object.keys(qaCheckTypeLabels)) {
    checkTypeCounts.set(ct, { total: 0, pending: 0 });
  }
  for (const qc of qualityChecks) {
    const entry = checkTypeCounts.get(qc.checkType) ?? { total: 0, pending: 0 };
    entry.total++;
    if (qc.status === "pending" || qc.status === "reinspection_required") {
      entry.pending++;
    }
    checkTypeCounts.set(qc.checkType, entry);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateCheckDialog onSuccess={refresh} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(qaCheckTypeLabels).map(([type, label]) => {
          const counts = checkTypeCounts.get(type) ?? {
            total: 0,
            pending: 0,
          };
          return (
            <Card
              className="transition-colors hover:border-primary/50"
              key={type}
              tone="soft-stone"
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {counts.total} total checks
                </p>
                <div className="mt-3 flex gap-2">
                  <Badge variant="outline">{counts.pending} pending</Badge>
                  <Badge variant="secondary">{counts.total} total</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {qualityChecks.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-medium text-muted-foreground text-sm">
            Recent Checks
          </h3>
          {qualityChecks.slice(0, 10).map((qc) => (
            <Card key={qc.id} tone="canvas">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckStatusIcon result={qc.result} status={qc.status} />
                    {qaCheckListTitle(qc)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={qaCheckStatusBadge[qc.status] ?? "outline"}>
                      {qc.status.replaceAll("_", " ")}
                    </Badge>
                    {(qc.status === "pending" ||
                      qc.status === "reinspection_required") && (
                      <CompleteCheckDialog
                        checkId={qc.id}
                        onSuccess={refresh}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-xs">
                  <span>
                    Type: {qaCheckTypeLabels[qc.checkType] ?? qc.checkType}
                  </span>
                  <span>Inspector: {qc.inspector || "—"}</span>
                  {qc.completedAt && (
                    <span>
                      Completed:{" "}
                      {new Date(qc.completedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-4 text-muted-foreground text-sm">
          No quality checks recorded yet.
        </p>
      )}
    </div>
  );
}
