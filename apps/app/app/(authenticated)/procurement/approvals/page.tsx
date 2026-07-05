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
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { OperationalPageShell } from "../../components/operational-page-shell";
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  STATUS_CONFIG,
} from "../components/po-shared";

interface ApprovalHistory {
  action: string;
  entityId: string;
  entityType: string;
  id: string;
  metadata: any;
  newStatus: string | null;
  notes: string | null;
  performedAt: string;
  performedBy: string;
  previousStatus: string | null;
}

interface ApprovalOrder {
  approval_history: ApprovalHistory[];
  created_at: string;
  id: string;
  item_count: number;
  po_number: string;
  status: string;
  submitted_at: string | null;
  submitted_by: string | null;
  total: number;
  vendor_name: string | null;
}

// Approval chain steps
const _APPROVAL_STEPS = [
  { key: "requester", label: "Requester", description: "PO Created" },
  { key: "manager", label: "Manager", description: "Review & Approve" },
  { key: "finance", label: "Finance", description: "Final Review" },
];

function ApprovalChainStepper({
  status,
  approvalHistory,
}: {
  status: string;
  approvalHistory: ApprovalHistory[];
}) {
  // Determine step status
  const hasApproval =
    status === "approved" || status === "ordered" || status === "received";
  const hasRejection = status === "rejected";
  const isSubmitted = status === "submitted";

  // Check approval history for specific actions
  const managerApproval = approvalHistory.find((h) => h.action === "approved");
  const _financeApproval = hasApproval && managerApproval; // If approved, we assume finance also signed off

  return (
    <div className="mt-2 flex items-center gap-1">
      {/* Step 1: Requester - Always complete if we're viewing this */}
      <div className="flex items-center gap-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
        <span className="font-medium text-foreground text-xs">Requester</span>
      </div>

      <ArrowRight className="mx-1 h-3.5 w-3.5 text-gray-300" />

      {/* Step 2: Manager */}
      <div className="flex items-center gap-1.5">
        {managerApproval ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground text-xs">Manager</span>
          </>
        ) : hasRejection ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-foreground">
              <XCircle className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground text-xs">Manager</span>
          </>
        ) : isSubmitted ? (
          <>
            <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-muted/50 text-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground text-xs">Manager</span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-muted-foreground text-xs">
              Manager
            </span>
          </>
        )}
      </div>

      <ArrowRight className="mx-1 h-3.5 w-3.5 text-gray-300" />

      {/* Step 3: Finance */}
      <div className="flex items-center gap-1.5">
        {hasApproval ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground text-xs">Finance</span>
          </>
        ) : hasRejection ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-muted-foreground text-xs">
              Finance
            </span>
          </>
        ) : isSubmitted ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-muted-foreground text-xs">
              Finance
            </span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-muted-foreground text-xs">
              Finance
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function ApprovalHistoryTimeline({ history }: { history: ApprovalHistory[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        No approval history yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => {
        const isApproved = item.action === "approved";
        const isRejected = item.action === "rejected";

        return (
          <div className="flex gap-3" key={item.id}>
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  isApproved
                    ? "bg-muted/50 text-foreground"
                    : isRejected
                      ? "bg-muted/50 text-foreground"
                      : "bg-muted/50 text-foreground"
                }`}
              >
                {isApproved ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isRejected ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              {index < history.length - 1 && (
                <div className="my-1 h-full w-px bg-gray-200" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm capitalize">
                  {item.action}
                </span>
                <Badge className="text-xs" variant="outline">
                  {item.newStatus || item.action}
                </Badge>
              </div>
              <p className="mt-1 text-muted-foreground text-xs">
                {formatDate(item.performedAt)} by {item.performedBy || "System"}
              </p>
              {item.notes && (
                <p className="mt-2 rounded bg-muted p-2 text-muted-foreground text-sm">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ApprovalsPage() {
  const [orders, setOrders] = useState<ApprovalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ApprovalOrder | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/procurement/approvals/list");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to load approval orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    orderId: string,
    action: "approved" | "rejected"
  ) => {
    setActioning(orderId);
    try {
      const res = await apiFetch("/api/procurement/approvals/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh the list
        await loadOrders();
      } else {
        console.error("Action failed:", data.error);
      }
    } catch (error) {
      console.error("Failed to process action:", error);
    } finally {
      setActioning(null);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      // Map "pending" tab to "submitted" status
      const tabStatus = activeTab === "pending" ? "submitted" : activeTab;
      const matchesTab = activeTab === "all" || o.status === tabStatus;
      const matchesSearch =
        !searchQuery ||
        o.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchQuery]);

  const summaryStats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "submitted").length;
    const today = new Date().toDateString();
    const approvedToday = orders.filter(
      (o) =>
        o.status === "approved" &&
        o.approval_history?.some(
          (h) =>
            h.action === "approved" &&
            new Date(h.performedAt).toDateString() === today
        )
    ).length;
    const rejected = orders.filter((o) => o.status === "rejected").length;
    return { pending, approvedToday, rejected };
  }, [orders]);

  const openDetail = (order: ApprovalOrder) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <OperationalPageShell
        description="Review and approve purchase orders before they're sent to vendors."
        eyebrow="Procurement / Approvals"
        title="Approvals"
      >
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Pending Approval
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{summaryStats.pending}</div>
              <p className="text-muted-foreground text-xs">
                Awaiting your review
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Approved Today
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {summaryStats.approvedToday}
              </div>
              <p className="text-muted-foreground text-xs">
                Orders processed today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{summaryStats.rejected}</div>
              <p className="text-muted-foreground text-xs">Require attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by PO # or vendor name..."
            value={searchQuery}
          />
        </div>

        {/* Tabs & List */}
        <Tabs onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="rounded-[16px] border border-hairline bg-canvas p-1">
            <TabsTrigger
              className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
              value="pending"
            >
              Pending ({orders.filter((o) => o.status === "submitted").length})
            </TabsTrigger>
            <TabsTrigger
              className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
              value="approved"
            >
              Approved ({orders.filter((o) => o.status === "approved").length})
            </TabsTrigger>
            <TabsTrigger
              className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
              value="rejected"
            >
              Rejected ({orders.filter((o) => o.status === "rejected").length})
            </TabsTrigger>
            <TabsTrigger
              className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
              value="all"
            >
              All History ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-4" value={activeTab}>
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p className="mb-1 font-medium text-lg">No approvals found</p>
                  <p className="text-sm">
                    {activeTab === "pending"
                      ? "All caught up! No purchase orders pending approval."
                      : `No ${activeTab === "all" ? "" : activeTab} purchase orders.`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((order) => {
                  const config =
                    STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                  const Icon = config.icon;
                  const isPending = order.status === "submitted";
                  const isActioning = actioning === order.id;

                  return (
                    <Card
                      className="transition-shadow hover:border-primary/40"
                      key={order.id}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-semibold">
                                {order.po_number}
                              </span>
                              <Badge className={config.color}>
                                {config.label}
                              </Badge>
                              {order.vendor_name && (
                                <span className="text-muted-foreground text-sm">
                                  • {order.vendor_name}
                                </span>
                              )}
                            </div>

                            <div className="mb-1 flex items-center gap-4 text-muted-foreground text-sm">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3.5 w-3.5" />
                                {order.item_count} items
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatCurrency(order.total)}
                              </span>
                              {order.submitted_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  Submitted:{" "}
                                  {formatDateShort(order.submitted_at)}
                                </span>
                              )}
                            </div>

                            {/* Approval Chain Status */}
                            <ApprovalChainStepper
                              approvalHistory={order.approval_history}
                              status={order.status}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => openDetail(order)}
                              size="sm"
                              variant="ghost"
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              Details
                            </Button>
                            {isPending && (
                              <>
                                <Button
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  disabled={isActioning}
                                  onClick={() =>
                                    handleAction(order.id, "rejected")
                                  }
                                  size="sm"
                                  variant="outline"
                                >
                                  {isActioning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-1 h-4 w-4" />
                                  )}
                                  Reject
                                </Button>
                                <Button
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={isActioning}
                                  onClick={() =>
                                    handleAction(order.id, "approved")
                                  }
                                  size="sm"
                                >
                                  {isActioning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                  )}
                                  Approve
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </OperationalPageShell>

      {/* Detail Dialog */}
      <Dialog onOpenChange={setDetailOpen} open={detailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedOrder?.po_number}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.vendor_name || "No vendor assigned"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge
                    className={STATUS_CONFIG[selectedOrder.status]?.color || ""}
                  >
                    {STATUS_CONFIG[selectedOrder.status]?.label ||
                      selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedOrder.total)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Items</p>
                  <p className="font-medium">{selectedOrder.item_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Submitted</p>
                  <p className="font-medium">
                    {selectedOrder.submitted_at
                      ? formatDate(selectedOrder.submitted_at)
                      : "Not submitted"}
                  </p>
                </div>
              </div>

              {/* Approval Chain */}
              <div>
                <h4 className="mb-3 font-medium text-sm">Approval Chain</h4>
                <ApprovalChainStepper
                  approvalHistory={selectedOrder.approval_history}
                  status={selectedOrder.status}
                />
              </div>

              {/* Approval History */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-medium text-sm">
                  <MessageSquare className="h-4 w-4" />
                  Approval History
                </h4>
                <ApprovalHistoryTimeline
                  history={selectedOrder.approval_history}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
