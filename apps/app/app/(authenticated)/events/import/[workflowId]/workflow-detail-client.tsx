"use client";

import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  Loader2,
  PartyPopper,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getEventImportWorkflow,
  eventImportWorkflowCancel,
  eventImportWorkflowResume,
  eventImportWorkflowRetry,
} from "@/app/lib/manifest-client.generated";

interface EventImport {
  id: string;
  tenantId: string;
  eventId: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileType: string;
  detectedFormat: string | null;
  parseStatus: string;
  extractedData: Record<string, unknown> | null;
  confidence: number | null;
  parseErrors: string[];
  reportId: string | null;
  battleBoardId: string | null;
  parsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const WORKFLOW_PHASES = [
  { key: "created", label: "Created", icon: FileText },
  { key: "extracting", label: "Extracting", icon: Zap },
  { key: "parsing", label: "Parsing", icon: Search },
  { key: "validating", label: "Validating", icon: ShieldCheck },
  { key: "reserving", label: "Reserving", icon: CalendarCheck },
  { key: "proposing", label: "Proposing", icon: ListChecks },
  { key: "activating", label: "Activating", icon: Rocket },
  { key: "completed", label: "Completed", icon: PartyPopper },
] as const;

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "success" | "info" | "warning" | "error" | "neutral";
  }
> = {
  pending: { label: "Pending", variant: "neutral" },
  extracting: { label: "Extracting", variant: "info" },
  parsing: { label: "Parsing", variant: "info" },
  parsed: { label: "Parsed", variant: "info" },
  validating: { label: "Validating", variant: "info" },
  reserving: { label: "Reserving", variant: "info" },
  proposing: { label: "Proposing", variant: "info" },
  activating: { label: "Activating", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  failed: { label: "Failed", variant: "error" },
  cancelled: { label: "Cancelled", variant: "neutral" },
};

function getPhaseIndex(status: string): number {
  const normalized = status.toLowerCase();
  for (let i = WORKFLOW_PHASES.length - 1; i >= 0; i--) {
    if (WORKFLOW_PHASES[i].key === normalized) return i;
  }
  if (normalized === "parsed") return 3;
  if (normalized === "paused") return -1;
  if (normalized === "failed") return -2;
  if (normalized === "cancelled") return -3;
  return 0;
}

function isTerminalStatus(status: string): boolean {
  return ["completed", "cancelled", "failed"].includes(status.toLowerCase());
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface WorkflowDetailClientProps {
  workflowId: string;
}

export function WorkflowDetailClient({
  workflowId,
}: WorkflowDetailClientProps) {
  const [workflow, setWorkflow] = useState<EventImport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "resume" | "retry" | "cancel";
    label: string;
  } | null>(null);
  const [actioning, setActioning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadWorkflow = useCallback(async () => {
    try {
      const data = await getEventImportWorkflow(workflowId);
      if (!data) {
        setError("Workflow not found");
        return;
      }
      setWorkflow(data as unknown as EventImport);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow");
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  useEffect(() => {
    if (workflow && !isTerminalStatus(workflow.parseStatus)) {
      pollRef.current = setInterval(loadWorkflow, 5000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [workflow?.parseStatus, loadWorkflow]);

  const handleCommand = async (command: "resume" | "retry" | "cancel") => {
    setActioning(true);
    try {
      const commandFn = {
        resume: eventImportWorkflowResume,
        retry: eventImportWorkflowRetry,
        cancel: eventImportWorkflowCancel,
      }[command];

      await commandFn({ id: workflowId });
      toast.success(`Workflow ${command}ed successfully`);
      setConfirmAction(null);
      await loadWorkflow();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${command}`);
    } finally {
      setActioning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-center">
        <AlertCircle className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {error ?? "Workflow not found"}
        </p>
        <Button asChild className="mt-4" size="sm" variant="outline">
          <Link href="/events/import">
            <ArrowLeft className="mr-2 size-4" />
            Back to Import
          </Link>
        </Button>
      </div>
    );
  }

  const currentPhaseIndex = getPhaseIndex(workflow.parseStatus);
  const isFailed = workflow.parseStatus.toLowerCase() === "failed";
  const isPaused = workflow.parseStatus.toLowerCase() === "paused";
  const isCancelled = workflow.parseStatus.toLowerCase() === "cancelled";
  const isCompleted = workflow.parseStatus.toLowerCase() === "completed";
  const isTerminal = isTerminalStatus(workflow.parseStatus);
  const statusCfg =
    STATUS_CONFIG[workflow.parseStatus.toLowerCase()] ?? STATUS_CONFIG.pending!;

  return (
    <>
      {/* Header Section */}
      <div className="rounded-[22px] border border-hairline bg-canvas p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <StatusPill>
                {statusCfg.variant === "success" && (
                  <CheckCircle2 className="mr-1 size-3" />
                )}
                {statusCfg.variant === "error" && (
                  <XCircle className="mr-1 size-3" />
                )}
                {statusCfg.variant === "warning" && (
                  <PauseCircle className="mr-1 size-3" />
                )}
                {statusCfg.variant === "info" && (
                  <RefreshCw className="mr-1 size-3 animate-spin" />
                )}
                {statusCfg.variant === "neutral" && (
                  <Clock className="mr-1 size-3" />
                )}
                {statusCfg.label}
              </StatusPill>
              <span className="font-mono text-xs text-muted-foreground">
                {workflow.id.slice(0, 8)}
              </span>
            </div>
            <h2 className="text-lg font-semibold">{workflow.fileName}</h2>
            <p className="text-sm text-muted-foreground">
              {workflow.fileType.toUpperCase()} &middot;{" "}
              {formatBytes(workflow.fileSize)}
              {workflow.detectedFormat && ` \u00B7 ${workflow.detectedFormat}`}
              {workflow.confidence !== null &&
                ` \u00B7 ${workflow.confidence}% confidence`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={loadWorkflow} size="sm" variant="outline">
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            {isPaused && (
              <Button
                disabled={actioning}
                onClick={() =>
                  setConfirmAction({ type: "resume", label: "Resume" })
                }
                size="sm"
              >
                <PlayCircle className="mr-2 size-4" />
                Resume
              </Button>
            )}
            {isFailed && (
              <Button
                disabled={actioning}
                onClick={() =>
                  setConfirmAction({ type: "retry", label: "Retry" })
                }
                size="sm"
              >
                <RotateCcw className="mr-2 size-4" />
                Retry
              </Button>
            )}
            {!(isTerminal || isPaused) && (
              <Button
                disabled={actioning}
                onClick={() =>
                  setConfirmAction({ type: "cancel", label: "Cancel" })
                }
                size="sm"
                variant="destructive"
              >
                <XCircle className="mr-2 size-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="rounded-[14px] border border-hairline p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Created
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(workflow.createdAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(workflow.createdAt)}
            </p>
          </div>
          <div className="rounded-[14px] border border-hairline p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Last Updated
            </p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(workflow.updatedAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTimeAgo(workflow.updatedAt)}
            </p>
          </div>
          <div className="rounded-[14px] border border-hairline p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Current Phase
            </p>
            <p className="mt-1 text-sm font-medium capitalize">
              {isFailed
                ? "Failed"
                : isPaused
                  ? "Paused"
                  : isCancelled
                    ? "Cancelled"
                    : workflow.parseStatus}
            </p>
            <p className="text-xs text-muted-foreground">
              {isFailed
                ? "Needs retry"
                : isPaused
                  ? "Needs resume"
                  : isCompleted
                    ? "All phases complete"
                    : `Phase ${Math.max(0, currentPhaseIndex) + 1} of ${WORKFLOW_PHASES.length}`}
            </p>
          </div>
          <div className="rounded-[14px] border border-hairline p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Confidence
            </p>
            <p className="mt-1 text-sm font-medium">
              {workflow.confidence ?? 0}%
            </p>
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${workflow.confidence ?? 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="rounded-[22px] border border-hairline bg-canvas p-6">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-6">
          Workflow Progress
        </h3>
        <div className="relative">
          {/* Horizontal stepper */}
          <div className="flex items-start justify-between">
            {WORKFLOW_PHASES.map((phase, index) => {
              const completed = isCompletedPhase(
                index,
                currentPhaseIndex,
                workflow.parseStatus
              );
              const active = index === currentPhaseIndex;
              const Icon = phase.icon;

              return (
                <div
                  className="flex flex-col items-center"
                  key={phase.key}
                  style={{
                    flex: 1,
                    maxWidth: `${100 / WORKFLOW_PHASES.length}%`,
                  }}
                >
                  {/* Circle with connector line */}
                  <div className="relative flex w-full items-center">
                    {index > 0 && (
                      <div
                        className={`absolute right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${
                          completed
                            ? "bg-primary"
                            : active
                              ? "bg-primary/50"
                              : "bg-muted"
                        }`}
                        style={{ width: "100%" }}
                      />
                    )}
                    <div className="relative z-10 mx-auto flex size-9 items-center justify-center rounded-full border-2 bg-background">
                      {completed ? (
                        <CheckCircle2 className="size-5 text-primary" />
                      ) : active ? (
                        <div className="flex size-5 items-center justify-center">
                          <Icon className="size-4 text-primary" />
                        </div>
                      ) : (
                        <div className="size-2 rounded-full bg-muted-foreground/30" />
                      )}
                      {active && !isTerminal && (
                        <div className="absolute inset-0 animate-ping rounded-full border-2 border-primary/30" />
                      )}
                    </div>
                    {index < WORKFLOW_PHASES.length - 1 && (
                      <div
                        className={`absolute left-1/2 top-1/2 h-0.5 -translate-y-1/2 ${
                          completed
                            ? "bg-primary"
                            : active
                              ? "bg-primary/50"
                              : "bg-muted"
                        }`}
                        style={{ width: "100%" }}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={`mt-2 text-center text-xs font-medium ${
                      completed
                        ? "text-primary"
                        : active
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {phase.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Failed indicator overlay */}
        {isFailed && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <XCircle className="size-4 text-destructive flex-shrink-0" />
            <span className="text-sm text-destructive">
              Workflow failed. Review errors below and retry when ready.
            </span>
          </div>
        )}

        {isPaused && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <PauseCircle className="size-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-600">
              Workflow is paused. Resume to continue processing.
            </span>
          </div>
        )}
      </div>

      {/* Errors & Warnings */}
      {workflow.parseErrors.length > 0 && (
        <div className="rounded-[22px] border border-hairline bg-canvas p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            Errors ({workflow.parseErrors.length})
          </h3>
          <div className="space-y-2">
            {workflow.parseErrors.map((err, index) => (
              <div
                className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                key={`error-${index}`}
              >
                <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-destructive" />
                <span className="text-sm text-destructive">{err}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Data */}
      {workflow.extractedData && (
        <div className="rounded-[22px] border border-hairline bg-canvas p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            Extracted Data
          </h3>
          <div className="rounded-lg border border-hairline bg-muted/30 p-4">
            <pre className="max-h-80 overflow-auto text-xs whitespace-pre-wrap break-words">
              {JSON.stringify(workflow.extractedData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Generated Artifacts */}
      {(workflow.reportId || workflow.battleBoardId) && (
        <div className="rounded-[22px] border border-hairline bg-canvas p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
            Generated Artifacts
          </h3>
          <div className="flex flex-wrap gap-3">
            {workflow.battleBoardId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/events/battle-boards/${workflow.battleBoardId}`}>
                  View Battle Board
                </Link>
              </Button>
            )}
            {workflow.reportId && (
              <Button asChild size="sm" variant="outline">
                <Link href={`/events/reports/${workflow.reportId}`}>
                  View Report
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {!isTerminal && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Auto-refreshing every 5 seconds
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setConfirmAction(null)}
        open={!!confirmAction}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "cancel"
                ? "Cancel Workflow"
                : confirmAction?.type === "resume"
                  ? "Resume Workflow"
                  : "Retry Workflow"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "cancel"
                ? "Are you sure you want to cancel this import workflow? This will stop all processing and cannot be undone."
                : confirmAction?.type === "resume"
                  ? "Resume this paused workflow? Processing will continue from where it left off."
                  : "Retry this failed workflow? Processing will restart from the failed phase."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmAction(null)} variant="outline">
              Go Back
            </Button>
            <Button
              disabled={actioning}
              onClick={() => confirmAction && handleCommand(confirmAction.type)}
              variant={
                confirmAction?.type === "cancel" ? "destructive" : "default"
              }
            >
              {actioning && <Loader2 className="mr-2 size-4 animate-spin" />}
              {confirmAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function isCompletedPhase(
  phaseIndex: number,
  currentPhaseIndex: number,
  status: string
): boolean {
  if (status.toLowerCase() === "completed") return true;
  if (phaseIndex < currentPhaseIndex) return true;
  return false;
}
