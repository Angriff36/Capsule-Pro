"use client";

import { apiFetch } from "@/app/lib/api";
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
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  STATUS_CONFIG,
} from "../components/po-shared";

interface ApprovalHistory {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  previousStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  metadata: any;
}

interface ApprovalOrder {
  id: string;
  po_number: string;
  vendor_name: string | null;
  status: string;
  total: number;
  item_count: number;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  approval_history: ApprovalHistory[];
}

// Approval chain steps
const APPROVAL_STEPS = [
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
  const financeApproval = hasApproval && managerApproval; // If approved, we assume finance also signed off

  return (
    <div className="flex items-center gap-1 mt-2">
      {/* Step 1: Requester - Always complete if we're viewing this */}
      <div className="flex items-center gap-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-green-700">Requester</span>
      </div>

      <ArrowRight className="h-3.5 w-3.5 text-gray-300 mx-1" />

      {/* Step 2: Manager */}
      <div className="flex items-center gap-1.5">
        {managerApproval ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-green-700">Manager</span>
          </>
        ) : hasRejection ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600">
              <XCircle className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-red-700">Manager</span>
          </>
        ) : isSubmitted ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 animate-pulse">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-blue-700">Manager</span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-gray-500">Manager</span>
          </>
        )}
      </div>

      <ArrowRight className="h-3.5 w-3.5 text-gray-300 mx-1" />

      {/* Step 3: Finance */}
      <div className="flex items-center gap-1.5">
        {hasApproval ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-green-700">Finance</span>
          </>
        ) : hasRejection ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-gray-500">Finance</span>
          </>
        ) : isSubmitted ? (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-gray-500">Finance</span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-medium text-gray-500">Finance</span>
          </>
        )}
      </div>
    </div>
  );
}

function ApprovalHistoryTimeline({ history }: { history: ApprovalHistory[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
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
                    ? "bg-green-100 text-green-600"
                    : isRejected
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-100 text-blue-600"
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
                <div className="w-px h-full bg-gray-200 my-1" />
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
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(item.performedAt)} by {item.performedBy || "System"}
              </p>
              {item.notes && (
                <p className="text-sm text-muted-foreground mt-2 bg-muted p-2 rounded">
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
      if (data.success) setOrders(data.data.orders || []);
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
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve purchase orders before they're sent to vendors.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Today
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.approvedToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Orders processed today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.rejected}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by PO # or vendor name..."
          value={searchQuery}
        />
      </div>

      {/* Tabs & List */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({orders.filter((o) => o.status === "submitted").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({orders.filter((o) => o.status === "approved").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({orders.filter((o) => o.status === "rejected").length})
          </TabsTrigger>
          <TabsTrigger value="all">All History ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value={activeTab}>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-1">No approvals found</p>
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
                    className="hover:shadow-sm transition-shadow"
                    key={order.id}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {order.po_number}
                            </span>
                            <Badge className={config.color}>
                              {config.label}
                            </Badge>
                            {order.vendor_name && (
                              <span className="text-sm text-muted-foreground">
                                • {order.vendor_name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
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
                                Submitted: {formatDateShort(order.submitted_at)}
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
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          {isPending && (
                            <>
                              <Button
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
                                  <XCircle className="h-4 w-4 mr-1" />
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
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
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
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    className={STATUS_CONFIG[selectedOrder.status]?.color || ""}
                  >
                    {STATUS_CONFIG[selectedOrder.status]?.label ||
                      selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedOrder.total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="font-medium">{selectedOrder.item_count}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {selectedOrder.submitted_at
                      ? formatDate(selectedOrder.submitted_at)
                      : "Not submitted"}
                  </p>
                </div>
              </div>

              {/* Approval Chain */}
              <div>
                <h4 className="text-sm font-medium mb-3">Approval Chain</h4>
                <ApprovalChainStepper
                  approvalHistory={selectedOrder.approval_history}
                  status={selectedOrder.status}
                />
              </div>

              {/* Approval History */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
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
    </div>
  );
}
