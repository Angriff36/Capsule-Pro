"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
  StatusPill,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Play, Plus, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Schedule {
  id: string;
  invoiceId: string;
  clientId: string;
  invoiceNumber: string;
  clientName: string;
  method: string;
  status: string;
  totalAmount: number;
  recognizedAmount: number;
  remainingAmount: number;
  startDate: string;
  endDate: string;
  description: string | null;
  recognitionPeriod: number;
  totalMilestones: number;
  completedMilestones: number;
  createdAt: string;
}

interface Metrics {
  totalSchedules: number;
  inProgress: number;
  completed: number;
  totalRecognized: number;
  totalRemaining: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatMethod(method: string) {
  const labels: Record<string, string> = {
    POINT_IN_TIME: "Point in Time",
    OVER_TIME_MILESTONE: "Milestone",
    OVER_TIME_PERCENTAGE: "Percentage",
    OVER_TIME_STRAIGHT_LINE: "Straight Line",
  };
  return labels[method] ?? method.replace(/_/g, " ");
}

function statusTone(status: string) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return map[status] ?? "";
}

/* -------------------------------------------------------------------------- */
/*  Create schedule form                                                      */
/* -------------------------------------------------------------------------- */

const METHODS = [
  { value: "POINT_IN_TIME", label: "Point in Time" },
  { value: "OVER_TIME_MILESTONE", label: "Over Time - Milestone" },
  { value: "OVER_TIME_PERCENTAGE", label: "Over Time - Percentage" },
  { value: "OVER_TIME_STRAIGHT_LINE", label: "Over Time - Straight Line" },
];

interface CreateFormState {
  invoiceId: string;
  clientId: string;
  method: string;
  totalAmount: string;
  startDate: string;
  endDate: string;
  description: string;
  recognitionPeriod: string;
}

const initialForm: CreateFormState = {
  invoiceId: "",
  clientId: "",
  method: "POINT_IN_TIME",
  totalAmount: "",
  startDate: "",
  endDate: "",
  description: "",
  recognitionPeriod: "1",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function RevenueRecognitionClient({
  schedules: initialSchedules,
  metrics: initialMetrics,
}: {
  schedules: Schedule[];
  metrics: Metrics;
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(initialForm);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [recognizeOpen, setRecognizeOpen] = useState<string | null>(null);
  const [recognizeAmount, setRecognizeAmount] = useState("");
  const [cancelOpen, setCancelOpen] = useState<string | null>(null);

  /* ---- filtered list ---- */
  const filtered = useMemo(() => {
    let result = schedules;
    if (statusFilter !== "ALL") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (methodFilter !== "ALL") {
      result = result.filter((s) => s.method === methodFilter);
    }
    return result;
  }, [schedules, statusFilter, methodFilter]);

  /* ---- refresh from API ---- */
  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      if (methodFilter !== "ALL") {
        params.set("method", methodFilter);
      }
      const res = await fetch(
        `/api/accounting/revenue-recognition/schedules?${params.toString()}`
      );
      if (!res.ok) {
        return;
      }
      const { data } = await res.json();
      if (!Array.isArray(data)) {
        return;
      }

      // We still need client/invoice names from our original data
      const clientNames = Object.fromEntries(
        initialSchedules.map((s) => [s.clientId, s.clientName])
      );
      const invoiceNumbers = Object.fromEntries(
        initialSchedules.map((s) => [s.invoiceId, s.invoiceNumber])
      );

      const mapped: Schedule[] = data.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        invoiceId: (s.invoice_id as string) ?? (s.invoiceId as string),
        clientId: (s.client_id as string) ?? (s.clientId as string),
        invoiceNumber:
          invoiceNumbers[(s.invoice_id as string) ?? (s.invoiceId as string)] ??
          "Unknown",
        clientName:
          clientNames[(s.client_id as string) ?? (s.clientId as string)] ??
          "Unknown",
        method: s.method as string,
        status: s.status as string,
        totalAmount: Number(s.total_amount ?? s.totalAmount ?? 0),
        recognizedAmount: Number(
          s.recognized_amount ?? s.recognizedAmount ?? 0
        ),
        remainingAmount: Number(s.remaining_amount ?? s.remainingAmount ?? 0),
        startDate: new Date(
          (s.start_date as string) ?? (s.startDate as string)
        ).toISOString(),
        endDate: new Date(
          (s.end_date as string) ?? (s.endDate as string)
        ).toISOString(),
        description: (s.description as string) ?? null,
        recognitionPeriod: Number(
          s.recognition_period ?? s.recognitionPeriod ?? 1
        ),
        totalMilestones: Number(s.total_milestones ?? s.totalMilestones ?? 0),
        completedMilestones: Number(
          s.completed_milestones ?? s.completedMilestones ?? 0
        ),
        createdAt: new Date(
          (s.created_at as string) ?? (s.createdAt as string)
        ).toISOString(),
      }));

      setSchedules(mapped);
      setMetrics({
        totalSchedules: mapped.length,
        inProgress: mapped.filter((s) => s.status === "IN_PROGRESS").length,
        completed: mapped.filter((s) => s.status === "COMPLETED").length,
        totalRecognized: mapped.reduce((sum, s) => sum + s.recognizedAmount, 0),
        totalRemaining: mapped.reduce((sum, s) => sum + s.remainingAmount, 0),
      });
    } catch {
      // silently fail — server-rendered data is still visible
    }
  }, [statusFilter, methodFilter, initialSchedules]);

  /* ---- create ---- */
  const handleCreate = useCallback(async () => {
    if (
      !(createForm.invoiceId && createForm.clientId && createForm.totalAmount)
    ) {
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/accounting/revenue-recognition/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: createForm.invoiceId,
          clientId: createForm.clientId,
          method: createForm.method,
          totalAmount: Number(createForm.totalAmount),
          remainingAmount: Number(createForm.totalAmount),
          startDate: createForm.startDate || new Date().toISOString(),
          endDate:
            createForm.endDate ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          recognitionPeriod: Number(createForm.recognitionPeriod) || 1,
          description: createForm.description || null,
        }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setCreateForm(initialForm);
        await refresh();
      }
    } finally {
      setCreating(false);
    }
  }, [createForm, refresh]);

  /* ---- actions ---- */
  const patchAction = useCallback(
    async (id: string, action: string, body?: Record<string, unknown>) => {
      setActionLoading(id);
      try {
        const res = await fetch(
          `/api/accounting/revenue-recognition/schedules/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, ...body }),
          }
        );
        if (res.ok) {
          await refresh();
        }
      } finally {
        setActionLoading(null);
      }
    },
    [refresh]
  );

  const handleRecognize = useCallback(
    async (id: string) => {
      const amount = Number.parseFloat(recognizeAmount);
      if (!amount || amount <= 0) {
        return;
      }
      setRecognizeOpen(null);
      setRecognizeAmount("");
      await patchAction(id, "recognize", { amount });
    },
    [recognizeAmount, patchAction]
  );

  const handleCancel = useCallback(
    async (id: string) => {
      setCancelOpen(null);
      await patchAction(id, "cancel");
    },
    [patchAction]
  );

  /* ---- render ---- */
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Accounting</MonoLabel>
            <DisplayHeading>Revenue Recognition</DisplayHeading>
            <CommandBandLede>
              Manage revenue recognition schedules, track milestone progress,
              and ensure ASC 606 compliance across active contracts.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/invoices">View invoices</Link>
            </Button>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/payments">Payments</Link>
            </Button>
            <Dialog onOpenChange={setCreateOpen} open={createOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-white text-deep-green hover:bg-white/90"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Recognition Schedule</DialogTitle>
                  <DialogDescription>
                    Set up a new revenue recognition schedule linked to an
                    invoice.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="cr-invoice">
                      Invoice ID
                    </label>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      id="cr-invoice"
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          invoiceId: e.target.value,
                        }))
                      }
                      placeholder="UUID of the invoice"
                      value={createForm.invoiceId}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="cr-client">
                      Client ID
                    </label>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      id="cr-client"
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          clientId: e.target.value,
                        }))
                      }
                      placeholder="UUID of the client"
                      value={createForm.clientId}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="cr-method">
                      Method
                    </label>
                    <Select
                      onValueChange={(v) =>
                        setCreateForm((f) => ({ ...f, method: v }))
                      }
                      value={createForm.method}
                    >
                      <SelectTrigger id="cr-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="cr-amount"
                      >
                        Total Amount
                      </label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        id="cr-amount"
                        inputMode="decimal"
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            totalAmount: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        type="number"
                        value={createForm.totalAmount}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="cr-period"
                      >
                        Recognition Period
                      </label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        id="cr-period"
                        inputMode="numeric"
                        min="1"
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            recognitionPeriod: e.target.value,
                          }))
                        }
                        placeholder="1"
                        type="number"
                        value={createForm.recognitionPeriod}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="cr-start">
                        Start Date
                      </label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        id="cr-start"
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            startDate: e.target.value,
                          }))
                        }
                        type="date"
                        value={createForm.startDate}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="cr-end">
                        End Date
                      </label>
                      <input
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        id="cr-end"
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            endDate: e.target.value,
                          }))
                        }
                        type="date"
                        value={createForm.endDate}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="cr-desc">
                      Description
                    </label>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      id="cr-desc"
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Optional description"
                      value={createForm.description}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={creating}
                    onClick={handleCreate}
                    type="button"
                  >
                    {creating ? "Creating..." : "Create Schedule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total Schedules</MetricLabel>
              <MetricValue>{metrics.totalSchedules}</MetricValue>
              <p className="text-sm text-white/70">
                {metrics.inProgress} active, {metrics.completed} completed
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Contract Value</MetricLabel>
              <MetricValue>
                {formatCurrency(
                  metrics.totalRecognized + metrics.totalRemaining
                )}
              </MetricValue>
              <p className="text-sm text-white/70">
                Total across all schedules
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Recognized</MetricLabel>
              <MetricValue>
                {formatCurrency(metrics.totalRecognized)}
              </MetricValue>
              <p className="text-sm text-white/70">
                Revenue recognized to date
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Remaining</MetricLabel>
              <MetricValue>
                {formatCurrency(metrics.totalRemaining)}
              </MetricValue>
              <p className="text-sm text-white/70">Pending recognition</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${filtered.length} shown`}
            description="Revenue recognition schedules with milestone tracking and ASC 606 compliance."
            eyebrow="Accounting"
            title="Recognition Schedules"
          />

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={setMethodFilter} value={methodFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Methods</SelectItem>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== "ALL" || methodFilter !== "ALL") && (
              <Button
                onClick={() => {
                  setStatusFilter("ALL");
                  setMethodFilter("ALL");
                }}
                size="sm"
                variant="ghost"
              >
                Clear filters
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
              No revenue recognition schedules found.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              {/* Table header */}
              <div className="grid grid-cols-[1.1fr_0.9fr_1fr_0.65fr_0.8fr_0.8fr_0.8fr_1.2fr] gap-4 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span>Client / Invoice</span>
                <span>Method</span>
                <span>Status</span>
                <span className="text-right">Total</span>
                <span className="text-right">Recognized</span>
                <span className="text-right">Remaining</span>
                <span>Period</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Table rows */}
              {filtered.map((schedule) => (
                <div
                  className="grid grid-cols-[1.1fr_0.9fr_1fr_0.65fr_0.8fr_0.8fr_0.8fr_1.2fr] gap-4 border-b border-hairline px-5 py-4 text-sm last:border-b-0"
                  key={schedule.id}
                >
                  {/* Client / Invoice */}
                  <div className="space-y-1">
                    <div className="font-medium text-ink">
                      {schedule.clientName}
                    </div>
                    <div className="text-muted-foreground">
                      {schedule.invoiceNumber}
                    </div>
                    {schedule.description && (
                      <div className="truncate text-xs text-muted-foreground">
                        {schedule.description}
                      </div>
                    )}
                  </div>

                  {/* Method */}
                  <div className="space-y-1 text-muted-foreground">
                    <div>{formatMethod(schedule.method)}</div>
                    {schedule.totalMilestones > 0 && (
                      <div className="text-xs">
                        {schedule.completedMilestones}/
                        {schedule.totalMilestones} milestones
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <StatusPill className={statusTone(schedule.status)}>
                      {schedule.status.replace(/_/g, " ")}
                    </StatusPill>
                  </div>

                  {/* Total */}
                  <div className="text-right font-medium text-ink">
                    {formatCurrency(schedule.totalAmount)}
                  </div>

                  {/* Recognized */}
                  <div className="text-right text-muted-foreground">
                    {formatCurrency(schedule.recognizedAmount)}
                  </div>

                  {/* Remaining */}
                  <div className="text-right text-muted-foreground">
                    {formatCurrency(schedule.remainingAmount)}
                  </div>

                  {/* Period */}
                  <div className="space-y-1 text-muted-foreground">
                    <div>{formatDate(schedule.startDate)}</div>
                    <div>{formatDate(schedule.endDate)}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1">
                    {schedule.status === "PENDING" && (
                      <Button
                        className="h-7 px-2 text-xs"
                        disabled={actionLoading === schedule.id}
                        onClick={() => patchAction(schedule.id, "start")}
                        size="sm"
                        variant="outline"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Start
                      </Button>
                    )}
                    {schedule.status === "IN_PROGRESS" &&
                      schedule.remainingAmount > 0 && (
                        <Dialog
                          onOpenChange={(open) => {
                            setRecognizeOpen(open ? schedule.id : null);
                            setRecognizeAmount("");
                          }}
                          open={recognizeOpen === schedule.id}
                        >
                          <Button
                            asChild
                            className="h-7 px-2 text-xs"
                            disabled={actionLoading === schedule.id}
                            size="sm"
                            variant="outline"
                          >
                            <DialogTrigger asChild>
                              <button
                                className="inline-flex items-center rounded-md border border-input bg-transparent px-2 text-xs hover:bg-accent"
                                type="button"
                              >
                                Recognize
                              </button>
                            </DialogTrigger>
                          </Button>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Recognize Revenue</DialogTitle>
                              <DialogDescription>
                                Enter the amount to recognize for this schedule.
                                Remaining:{" "}
                                {formatCurrency(schedule.remainingAmount)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <input
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                inputMode="decimal"
                                max={schedule.remainingAmount}
                                min="0.01"
                                onChange={(e) =>
                                  setRecognizeAmount(e.target.value)
                                }
                                placeholder="Amount to recognize"
                                step="0.01"
                                type="number"
                                value={recognizeAmount}
                              />
                            </div>
                            <DialogFooter>
                              <Button
                                disabled={
                                  !recognizeAmount ||
                                  Number.parseFloat(recognizeAmount) <= 0
                                }
                                onClick={() => handleRecognize(schedule.id)}
                                type="button"
                              >
                                Recognize
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    {schedule.status === "IN_PROGRESS" &&
                      schedule.recognizedAmount > 0 && (
                        <Button
                          className="h-7 px-2 text-xs"
                          disabled={actionLoading === schedule.id}
                          onClick={() => patchAction(schedule.id, "reverse")}
                          size="sm"
                          variant="ghost"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Reverse
                        </Button>
                      )}
                    {(schedule.status === "PENDING" ||
                      schedule.status === "IN_PROGRESS") && (
                      <Dialog
                        onOpenChange={(open) =>
                          setCancelOpen(open ? schedule.id : null)
                        }
                        open={cancelOpen === schedule.id}
                      >
                        <Button
                          asChild
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          disabled={actionLoading === schedule.id}
                          size="sm"
                          variant="ghost"
                        >
                          <DialogTrigger asChild>
                            <button
                              className="inline-flex items-center rounded-md px-2 text-xs text-destructive hover:text-destructive hover:bg-accent"
                              type="button"
                            >
                              <X className="mr-1 h-3 w-3" />
                              Cancel
                            </button>
                          </DialogTrigger>
                        </Button>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cancel Schedule</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to cancel this recognition
                              schedule? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              onClick={() => handleCancel(schedule.id)}
                              type="button"
                              variant="destructive"
                            >
                              Cancel Schedule
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
