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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Gavel,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  listCollectionCases,
  collectionCaseRecordPayment,
  collectionCaseEscalateDunning,
  collectionCaseClose,
  collectionCaseMarkDisputed,
  collectionCaseEscalateToLegalWithDetails,
  collectionCaseWriteOff,
  collectionCaseSetPriority,
} from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CollectionStatus = "ACTIVE" | "PAID" | "CLOSED" | "LEGAL" | "WRITE_OFF";
type CollectionPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type DunningStage =
  | "CURRENT"
  | "REMINDER_1"
  | "REMINDER_2"
  | "REMINDER_3"
  | "FINAL_NOTICE"
  | "COLLECTIONS";

interface CollectionCase {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  originalAmount: number | string;
  outstandingAmount: number | string;
  collectedAmount: number | string;
  status: CollectionStatus;
  priority: CollectionPriority;
  dunningStage: DunningStage;
  daysOverdue: number;
  agingBucket: string | null;
  assignedTo: string | null;
  hasPaymentPlan: boolean;
  isDisputed: boolean;
  isEscalatedToLegal: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  collectionPercentage: number;
  isHighRisk: boolean;
  isCritical: boolean;
  actions: CollectionActionItem[];
  paymentPlans: CollectionPaymentPlanItem[];
}

interface CollectionActionItem {
  id: string;
  actionType: string;
  description: string;
  outcome: string | null;
  contactedAt: string;
  createdAt: string;
}

interface CollectionPaymentPlanItem {
  id: string;
  totalAmount: number | string;
  installments: number;
  frequencyDays: number;
  startDate: string;
  status: string;
}

interface InitialMetrics {
  totalCases: number;
  activeCases: number;
  legalCases: number;
  outstandingTotal: number;
  collectedTotal: number;
  overdueCases: number;
  disputedCases: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (d: string | null) => {
  if (!d) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
};

const STATUS_CONFIG: Record<
  CollectionStatus,
  { label: string; variant: string }
> = {
  ACTIVE: { label: "Active", variant: "default" },
  PAID: { label: "Paid", variant: "default" },
  CLOSED: { label: "Closed", variant: "secondary" },
  LEGAL: { label: "Legal", variant: "destructive" },
  WRITE_OFF: { label: "Write-off", variant: "outline" },
};

const PRIORITY_CONFIG: Record<
  CollectionPriority,
  { label: string; color: string }
> = {
  LOW: { label: "Low", color: "text-muted-foreground" },
  MEDIUM: { label: "Medium", color: "text-amber-600" },
  HIGH: { label: "High", color: "text-orange-600" },
  URGENT: { label: "Urgent", color: "text-red-600" },
};

const DUNNING_LABELS: Record<DunningStage, string> = {
  CURRENT: "Current",
  REMINDER_1: "Reminder 1",
  REMINDER_2: "Reminder 2",
  REMINDER_3: "Reminder 3",
  FINAL_NOTICE: "Final Notice",
  COLLECTIONS: "Collections",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CollectionsClientProps {
  initialMetrics: InitialMetrics;
}

export function CollectionsClient({ initialMetrics }: CollectionsClientProps) {
  // State
  const [cases, setCases] = useState<CollectionCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialMetrics.totalCases);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [dunningDialogOpen, setDunningDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [writeOffDialogOpen, setWriteOffDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);

  // Selected case for actions
  const [selectedCase, setSelectedCase] = useState<CollectionCase | null>(null);

  // Form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [dunningStage, setDunningStage] = useState<string>("");
  const [closeResolution, setCloseResolution] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [legalCaseNumber, setLegalCaseNumber] = useState("");
  const [legalFirm, setLegalFirm] = useState("");
  const [writeOffReason, setWriteOffReason] = useState("");
  const [newPriority, setNewPriority] = useState<string>("");
  const [priorityReason, setPriorityReason] = useState("");

  // Create form
  const [createInvoiceId, setCreateInvoiceId] = useState("");
  const [createInvoiceNumber, setCreateInvoiceNumber] = useState("");
  const [createEventId, setCreateEventId] = useState("");
  const [createClientId, setCreateClientId] = useState("");
  const [createClientName, setCreateClientName] = useState("");
  const [createOriginalAmount, setCreateOriginalAmount] = useState("");
  const [createOutstandingAmount, setCreateOutstandingAmount] = useState("");
  const [createPriority, setCreatePriority] = useState<string>("MEDIUM");
  const [createNotes, setCreateNotes] = useState("");

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: Record<string, string | number> = {
        page,
        limit: 25,
      };
      if (statusFilter !== "all") query.status = statusFilter;
      if (priorityFilter !== "all") query.priority = priorityFilter;

      const result = await listCollectionCases(query);
      setCases(result.data as unknown as CollectionCase[]);
      setTotalCount(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load collection cases"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, priorityFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // ---------------------------------------------------------------------------
  // Filtered cases (client-side search)
  // ---------------------------------------------------------------------------

  const filteredCases = cases.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.clientName.toLowerCase().includes(q) ||
      c.invoiceNumber.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleRecordPayment = async () => {
    if (!(selectedCase && paymentAmount)) return;
    const amount = Number.parseFloat(paymentAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      await collectionCaseRecordPayment({ id: selectedCase.id, amount });
      toast.success("Payment recorded successfully");
      setPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedCase(null);
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    }
  };

  const handleEscalateDunning = async () => {
    if (!(selectedCase && dunningStage)) return;
    try {
      await collectionCaseEscalateDunning({ id: selectedCase.id, stage: dunningStage });
      toast.success("Dunning escalated successfully");
      setDunningDialogOpen(false);
      setDunningStage("");
      setSelectedCase(null);
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to escalate dunning");
    }
  };

  const handleCloseCase = async () => {
    if (!selectedCase) return;
    try {
      await collectionCaseClose({ id: selectedCase.id, resolution: closeResolution });
      toast.success("Case closed successfully");
      setCloseDialogOpen(false);
      setCloseResolution("");
      setSelectedCase(null);
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close case");
    }
  };

  const handleMarkDisputed = async () => {
    if (!selectedCase) return;
    try {
      await collectionCaseMarkDisputed({ id: selectedCase.id, reason: disputeReason });
      toast.success("Case marked as disputed");
      setDisputeDialogOpen(false);
      setDisputeReason("");
      setSelectedCase(null);
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark disputed");
    }
  };

  const handleEscalateLegal = async () => {
    if (!selectedCase) return;
    try {
      await collectionCaseEscalateToLegalWithDetails({
        id: selectedCase.id,
        legalCaseNumber,
        legalFirm,
      });
      toast.success("Escalated to legal successfully");
      setLegalDialogOpen(false);
      setLegalCaseNumber("");
      setLegalFirm("");
      setSelectedCase(null);
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to escalate to legal");
    }
  };

  const handleWriteOff = async () => {
    if (!(selectedCase && writeOffReason)) return;
    const amount = Number(selectedCase.outstandingAmount);
    try {
      await collectionCaseWriteOff({
        id: selectedCase.id,
        amount,
        reason: writeOffReason,
        approvedBy: selectedCase.assignedTo ?? selectedCase.id,
      });
      toast.success("Write-off completed");
      setWriteOffDialogOpen(false);
      setWriteOffReason("");
      setSelectedCase(null);
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to write off");
    }
  };

  const handleSetPriority = async () => {
    if (!(selectedCase && newPriority)) return;
    try {
      await collectionCaseSetPriority({
        id: selectedCase.id,
        newPriority,
        reason: priorityReason,
      });
      toast.success("Priority updated");
      setPriorityDialogOpen(false);
      setNewPriority("");
      setPriorityReason("");
      setSelectedCase(null);
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set priority");
    }
  };

  const handleReopen = async (c: CollectionCase) => {
    try {
      await collectionCaseClose({ id: c.id, resolution: "Reopened from collections UI" });
      toast.success("Case reopened");
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reopen case");
    }
  };

  const handleCreateCase = async () => {
    if (
      !(
        createInvoiceId &&
        createInvoiceNumber &&
        createClientId &&
        createClientName
      )
    ) {
      toast.error("Fill in all required fields");
      return;
    }
    try {
      // NOTE: No generated collectionCaseCreate function exists yet. Keeping apiFetch for case creation.
      const res = await apiFetch("/api/accounting/collections/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: createInvoiceId,
          invoiceNumber: createInvoiceNumber,
          eventId: createEventId,
          clientId: createClientId,
          clientName: createClientName,
          originalAmount: Number.parseFloat(createOriginalAmount) || 0,
          outstandingAmount: Number.parseFloat(createOutstandingAmount) || 0,
          priority: createPriority,
          notes: createNotes || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create case");
      }

      toast.success("Collection case created");
      setCreateDialogOpen(false);
      resetCreateForm();
      loadCases();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    }
  };

  const resetCreateForm = () => {
    setCreateInvoiceId("");
    setCreateInvoiceNumber("");
    setCreateEventId("");
    setCreateClientId("");
    setCreateClientName("");
    setCreateOriginalAmount("");
    setCreateOutstandingAmount("");
    setCreatePriority("MEDIUM");
    setCreateNotes("");
  };

  // ---------------------------------------------------------------------------
  // Action availability helpers
  // ---------------------------------------------------------------------------

  const canRecordPayment = (c: CollectionCase) =>
    c.status === "ACTIVE" || c.status === "LEGAL";

  const canEscalateDunning = (c: CollectionCase) =>
    c.status === "ACTIVE" && c.dunningStage !== "COLLECTIONS";

  const canClose = (c: CollectionCase) =>
    c.status === "ACTIVE" || c.status === "LEGAL";

  const canMarkDisputed = (c: CollectionCase) =>
    !c.isDisputed && c.status === "ACTIVE";

  const canEscalateLegal = (c: CollectionCase) =>
    c.status === "ACTIVE" && !c.isEscalatedToLegal;

  const canWriteOff = (c: CollectionCase) =>
    c.status === "ACTIVE" || c.status === "LEGAL";

  const canReopen = (c: CollectionCase) =>
    c.status === "CLOSED" || c.status === "WRITE_OFF";

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Filters & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-10"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, invoice..."
              type="text"
              value={searchQuery}
            />
          </div>
          <Select
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            value={statusFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="LEGAL">Legal</SelectItem>
              <SelectItem value="WRITE_OFF">Write-off</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(v) => {
              setPriorityFilter(v);
              setPage(1);
            }}
            value={priorityFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadCases} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New case
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && filteredCases.length === 0 && (
        <div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
          {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
            ? "No cases match the current filters. Try adjusting your search or filters."
            : "No collection cases yet. Overdue invoices will appear here, or create a case manually."}
        </div>
      )}

      {!isLoading && filteredCases.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_0.8fr_0.7fr_0.6fr_0.7fr_0.7fr_0.6fr_0.8fr] gap-3 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Client / Invoice</span>
            <span>Outstanding</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Dunning</span>
            <span>Overdue</span>
            <span>Plan</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Data rows */}
          {filteredCases.map((c) => (
            <div
              className={`grid grid-cols-[1fr_0.8fr_0.7fr_0.6fr_0.7fr_0.7fr_0.6fr_0.8fr] gap-3 border-b border-hairline px-5 py-4 text-sm last:border-b-0 ${
                c.isCritical
                  ? "bg-red-50/50 dark:bg-red-950/20"
                  : c.isHighRisk
                    ? "bg-amber-50/50 dark:bg-amber-950/10"
                    : ""
              }`}
              key={c.id}
            >
              {/* Client / Invoice */}
              <div className="space-y-1">
                <div className="font-medium text-ink">{c.clientName}</div>
                <div className="text-muted-foreground">
                  {c.invoiceNumber}
                  {c.isDisputed && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600">
                      <Shield className="h-3 w-3" />
                      Disputed
                    </span>
                  )}
                </div>
              </div>

              {/* Outstanding */}
              <div className="space-y-1">
                <div className="font-medium text-ink">
                  {formatCurrency(c.outstandingAmount)}
                </div>
                <div className="text-muted-foreground">
                  of {formatCurrency(c.originalAmount)}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center">
                <StatusPill>
                  {STATUS_CONFIG[c.status]?.label ?? c.status}
                </StatusPill>
              </div>

              {/* Priority */}
              <div className="flex items-center">
                <span
                  className={`font-medium ${PRIORITY_CONFIG[c.priority]?.color ?? ""}`}
                >
                  {PRIORITY_CONFIG[c.priority]?.label ?? c.priority}
                </span>
              </div>

              {/* Dunning */}
              <div className="flex items-center text-muted-foreground">
                {DUNNING_LABELS[c.dunningStage] ?? c.dunningStage}
              </div>

              {/* Overdue */}
              <div className="flex items-center text-muted-foreground">
                {c.daysOverdue > 0 ? `${c.daysOverdue}d` : "\u2014"}
                {c.agingBucket && (
                  <span className="ml-1 text-xs">({c.agingBucket})</span>
                )}
              </div>

              {/* Plan */}
              <div className="flex items-center text-muted-foreground">
                {c.hasPaymentPlan ? "Yes" : "\u2014"}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1">
                {canRecordPayment(c) && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setSelectedCase(c);
                      setPaymentDialogOpen(true);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Payment
                  </Button>
                )}
                {canEscalateDunning(c) && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setSelectedCase(c);
                      setDunningDialogOpen(true);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                    Escalate
                  </Button>
                )}
                {canReopen(c) && (
                  <Button
                    className="h-7 px-2 text-xs"
                    onClick={() => handleReopen(c)}
                    size="sm"
                    variant="ghost"
                  >
                    Reopen
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-7 px-2" size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canMarkDisputed(c) && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCase(c);
                          setDisputeDialogOpen(true);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Mark disputed
                      </DropdownMenuItem>
                    )}
                    {canEscalateLegal(c) && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCase(c);
                          setLegalDialogOpen(true);
                        }}
                      >
                        <Gavel className="mr-2 h-4 w-4" />
                        Escalate to legal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedCase(c);
                        setNewPriority(c.priority);
                        setPriorityDialogOpen(true);
                      }}
                    >
                      Change priority
                    </DropdownMenuItem>
                    {canClose(c) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedCase(c);
                            setCloseDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Close case
                        </DropdownMenuItem>
                      </>
                    )}
                    {canWriteOff(c) && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedCase(c);
                          setWriteOffDialogOpen(true);
                        }}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Write off
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * 25 + 1}&ndash;
            {Math.min(page * 25, totalCount)} of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Dialogs                                                           */}
      {/* ----------------------------------------------------------------- */}

      {/* Create Case */}
      <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create collection case</DialogTitle>
            <DialogDescription>
              Manually create a new collection case for an overdue invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Invoice ID *</label>
                <Input
                  onChange={(e) => setCreateInvoiceId(e.target.value)}
                  placeholder="UUID"
                  value={createInvoiceId}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Invoice number *</label>
                <Input
                  onChange={(e) => setCreateInvoiceNumber(e.target.value)}
                  placeholder="INV-001"
                  value={createInvoiceNumber}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client ID *</label>
                <Input
                  onChange={(e) => setCreateClientId(e.target.value)}
                  placeholder="UUID"
                  value={createClientId}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Client name *</label>
                <Input
                  onChange={(e) => setCreateClientName(e.target.value)}
                  placeholder="Acme Corp"
                  value={createClientName}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Event ID</label>
              <Input
                onChange={(e) => setCreateEventId(e.target.value)}
                placeholder="UUID (optional)"
                value={createEventId}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Original amount</label>
                <Input
                  onChange={(e) => setCreateOriginalAmount(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  value={createOriginalAmount}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Outstanding amount
                </label>
                <Input
                  onChange={(e) => setCreateOutstandingAmount(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  value={createOutstandingAmount}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  onValueChange={setCreatePriority}
                  value={createPriority}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Optional notes about this case..."
                value={createNotes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateForm();
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCase}>Create case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment */}
      <Dialog onOpenChange={setPaymentDialogOpen} open={paymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              Record a payment for <strong>{selectedCase?.clientName}</strong>{" "}
              (invoice {selectedCase?.invoiceNumber}). Outstanding:{" "}
              {selectedCase
                ? formatCurrency(selectedCase.outstandingAmount)
                : "\u2014"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment amount *</label>
              <Input
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                value={paymentAmount}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setPaymentDialogOpen(false);
                setPaymentAmount("");
                setSelectedCase(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dunning */}
      <Dialog onOpenChange={setDunningDialogOpen} open={dunningDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <ArrowUpRight className="mr-2 inline h-5 w-5" />
              Escalate dunning
            </DialogTitle>
            <DialogDescription>
              Advance the dunning stage for{" "}
              <strong>{selectedCase?.clientName}</strong>. Current stage:{" "}
              {selectedCase
                ? DUNNING_LABELS[selectedCase.dunningStage]
                : "\u2014"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New stage *</label>
              <Select onValueChange={setDunningStage} value={dunningStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REMINDER_1">Reminder 1</SelectItem>
                  <SelectItem value="REMINDER_2">Reminder 2</SelectItem>
                  <SelectItem value="REMINDER_3">Reminder 3</SelectItem>
                  <SelectItem value="FINAL_NOTICE">Final Notice</SelectItem>
                  <SelectItem value="COLLECTIONS">
                    External Collections
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setDunningDialogOpen(false);
                setDunningStage("");
                setSelectedCase(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleEscalateDunning}>Escalate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Case */}
      <Dialog onOpenChange={setCloseDialogOpen} open={closeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <CheckCircle className="mr-2 inline h-5 w-5" />
              Close case
            </DialogTitle>
            <DialogDescription>
              Close the collection case for{" "}
              <strong>{selectedCase?.clientName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution</label>
              <Textarea
                onChange={(e) => setCloseResolution(e.target.value)}
                placeholder="Describe how this case was resolved..."
                value={closeResolution}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setCloseDialogOpen(false);
                setCloseResolution("");
                setSelectedCase(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleCloseCase}>Close case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Disputed */}
      <Dialog onOpenChange={setDisputeDialogOpen} open={disputeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Shield className="mr-2 inline h-5 w-5" />
              Mark as disputed
            </DialogTitle>
            <DialogDescription>
              Flag the case for <strong>{selectedCase?.clientName}</strong> as
              disputed. This will pause automated dunning.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dispute reason</label>
              <Textarea
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the reason for the dispute..."
                value={disputeReason}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setDisputeDialogOpen(false);
                setDisputeReason("");
                setSelectedCase(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleMarkDisputed}>Mark disputed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate to Legal */}
      <Dialog onOpenChange={setLegalDialogOpen} open={legalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Gavel className="mr-2 inline h-5 w-5" />
              Escalate to legal
            </DialogTitle>
            <DialogDescription>
              Escalate the case for <strong>{selectedCase?.clientName}</strong>{" "}
              to legal proceedings. This will set the case to URGENT priority.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Legal case number</label>
              <Input
                onChange={(e) => setLegalCaseNumber(e.target.value)}
                placeholder="Optional"
                value={legalCaseNumber}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Legal firm</label>
              <Input
                onChange={(e) => setLegalFirm(e.target.value)}
                placeholder="Optional"
                value={legalFirm}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setLegalDialogOpen(false);
                setLegalCaseNumber("");
                setLegalFirm("");
                setSelectedCase(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleEscalateLegal} variant="destructive">
              Escalate to legal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Write Off */}
      <Dialog onOpenChange={setWriteOffDialogOpen} open={writeOffDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <AlertTriangle className="mr-2 inline h-5 w-5" />
              Write off
            </DialogTitle>
            <DialogDescription>
              Write off{" "}
              {selectedCase
                ? formatCurrency(selectedCase.outstandingAmount)
                : "\u2014"}{" "}
              for <strong>{selectedCase?.clientName}</strong>. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason *</label>
              <Textarea
                onChange={(e) => setWriteOffReason(e.target.value)}
                placeholder="Explain why this amount is being written off..."
                value={writeOffReason}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setWriteOffDialogOpen(false);
                setWriteOffReason("");
                setSelectedCase(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleWriteOff} variant="destructive">
              Write off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Priority */}
      <Dialog onOpenChange={setPriorityDialogOpen} open={priorityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change priority</DialogTitle>
            <DialogDescription>
              Update the priority for{" "}
              <strong>{selectedCase?.clientName}</strong>. Current:{" "}
              {selectedCase
                ? PRIORITY_CONFIG[selectedCase.priority]?.label
                : "\u2014"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New priority *</label>
              <Select onValueChange={setNewPriority} value={newPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Input
                onChange={(e) => setPriorityReason(e.target.value)}
                placeholder="Optional reason for the change"
                value={priorityReason}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setPriorityDialogOpen(false);
                setNewPriority("");
                setPriorityReason("");
                setSelectedCase(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleSetPriority}>Update priority</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
