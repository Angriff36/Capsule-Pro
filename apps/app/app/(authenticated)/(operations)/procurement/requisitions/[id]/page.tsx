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
} from "@repo/design-system/components/ui/dialog";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeft, DollarSign, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/app/lib/api";
import { executeCommand } from "@/app/lib/manifest-client";
import {
  getPurchaseRequisition,
  purchaseRequisitionReject,
} from "@/app/lib/manifest-client.generated";
import { OperationalPageShell } from "../../../../components/operational-page-shell";
import {
  formatCurrency,
  formatDate,
  PRIORITY_CONFIG,
  REQ_STATUS_CONFIG,
  type ReqStatusConfig,
} from "../../components/req-shared";

interface Requisition {
  department: string | null;
  estimatedShipping: number;
  estimatedTax: number;
  estimatedTotal: number;
  id: string;
  justification: string | null;
  notes: string | null;
  priority: string;
  rejectionReason: string | null;
  requestDate: string;
  requiredBy: string | null;
  requisitionNumber: string;
  status: string;
  submittedAt: string | null;
  subtotal: number;
}

const WORKFLOW_ACTIONS: Record<
  string,
  { label: string; command: string; variant?: "default" | "destructive" }[]
> = {
  draft: [{ label: "Submit for Approval", command: "submit" }],
  pending_manager: [
    { label: "Approve (Manager)", command: "approve-manager" },
    { label: "Reject", command: "reject", variant: "destructive" },
  ],
  pending_finance: [
    { label: "Approve (Finance)", command: "approve-finance" },
    { label: "Reject", command: "reject", variant: "destructive" },
  ],
  approved: [{ label: "Convert to PO", command: "convert-to-po" }],
};

const getReqStatusConfig = (status: string): ReqStatusConfig =>
  REQ_STATUS_CONFIG[status] ?? {
    label: status || "Unknown",
    color: "bg-muted/50 text-foreground",
    icon: FileText,
  };

const getPriorityConfig = (priority: string) =>
  PRIORITY_CONFIG[priority] ?? {
    label: priority || "Unknown",
    color: "bg-muted/50 text-foreground",
  };

export default function RequisitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id ?? "") as string;

  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");

  useEffect(() => {
    loadRequisition();
  }, [id]);

  const loadRequisition = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseRequisition(id);
      setRequisition((data as unknown as Requisition) ?? null);
    } catch (error) {
      console.error("Failed to load requisition:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (command: string) => {
    if (!requisition) {
      return;
    }
    if (command === "reject") {
      setReasonText("");
      setReasonDialogOpen(true);
      return;
    }
    setUpdating(command);
    try {
      if (command === "convert-to-po") {
        // Orchestrated conversion: creates the PO + line items and records the
        // link, all governed server-side (the bare convertToPo command only
        // records an id — it does not build an order).
        const response = await fetch(
          apiUrl(
            `/api/procurement/requisitions/${requisition.id}/convert-to-po`
          ),
          { method: "POST", credentials: "include" }
        );
        const body = (await response.json()) as {
          error?: string;
          redirectUrl?: string;
          success: boolean;
        };
        if (!body.success) {
          toast.error(body.error ?? "Failed to convert requisition");
          return;
        }
        toast.success("Purchase order created");
        if (body.redirectUrl) {
          router.push(body.redirectUrl);
          return;
        }
      } else {
        // Convert kebab-case command to camelCase for Manifest dispatcher
        const camelCommand = command.replace(/-([a-z])/g, (_, c) =>
          c.toUpperCase()
        );
        // submit/approveManager/approveFinance take the ACTOR's employee id
        // (userId) — resolve it server-side via /api/me; omitting it fails
        // the zod pre-flight silently from this page.
        const meResponse = await fetch(apiUrl("/api/me"), {
          credentials: "include",
        });
        const me = (await meResponse.json()) as { id?: string };
        if (!me.id) {
          toast.error("Could not resolve your user identity");
          return;
        }
        // approveManager is gated by the IR approval chain `procurementChain`
        // — grant the matching stage first (the engine validates the
        // approver's role against the stage policy), then run the command.
        const APPROVAL_STAGES: Record<string, string> = {
          "approve-manager": "manager",
          "approve-finance": "finance",
        };
        const stageName = APPROVAL_STAGES[command];
        if (stageName) {
          const approvalResponse = await fetch(apiUrl("/api/manifest/approvals"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entity: "PurchaseRequisition",
              instanceId: requisition.id,
              approvalName: "procurementChain",
              stageName,
              action: "approve",
            }),
          });
          const approvalBody = (await approvalResponse.json()) as {
            error?: string;
            success: boolean;
          };
          if (!approvalBody.success) {
            toast.error(approvalBody.error ?? "Approval was rejected");
            return;
          }
        }
        await executeCommand("PurchaseRequisition", camelCommand, {
          id: requisition.id,
          userId: me.id,
        });
        toast.success("Done");
      }
      await loadRequisition();
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error);
    } finally {
      setUpdating(null);
    }
  };

  const confirmReject = async () => {
    if (!(requisition && reasonText.trim())) {
      return;
    }
    setUpdating("reject");
    setReasonDialogOpen(false);
    try {
      const meResponse = await fetch(apiUrl("/api/me"), {
        credentials: "include",
      });
      const me = (await meResponse.json()) as { id?: string };
      await purchaseRequisitionReject({
        id: requisition.id,
        userId: me.id ?? "",
        reason: reasonText.trim(),
      });
      await loadRequisition();
    } catch (error) {
      console.error("Failed to execute reject:", error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Requisition not found.</p>
        <Link href="/procurement/requisitions">
          <Button className="mt-4" variant="outline">
            Back to Requisitions
          </Button>
        </Link>
      </div>
    );
  }

  const config = getReqStatusConfig(requisition.status);
  const Icon = config.icon;
  const priorityConfig = getPriorityConfig(requisition.priority);
  const actions = WORKFLOW_ACTIONS[requisition.status] || [];

  return (
    <>
      <OperationalPageShell
        actions={
          <>
            <Link href="/procurement/requisitions">
              <Button size="icon" variant="ghost">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            {actions.map((action) => (
              <Button
                disabled={updating === action.command}
                key={action.command}
                onClick={() => handleAction(action.command)}
                size="sm"
                variant={action.variant || "default"}
              >
                {updating === action.command && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {action.label}
              </Button>
            ))}
          </>
        }
        description={`${requisition.department || "No department"} · ${formatDate(requisition.requestDate)}`}
        eyebrow="Procurement / Requisitions"
        title={
          <span className="inline-flex items-center gap-3">
            {requisition.requisitionNumber}
            <Badge className={config.color}>
              <Icon className="mr-1 h-3 w-3" />
              {config.label}
            </Badge>
            <Badge className={priorityConfig.color} variant="outline">
              {priorityConfig.label}
            </Badge>
          </span>
        }
      >
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Subtotal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatCurrency(Number(requisition.subtotal))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Est. Tax</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatCurrency(Number(requisition.estimatedTax))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Est. Shipping
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatCurrency(Number(requisition.estimatedShipping))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Est. Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {formatCurrency(Number(requisition.estimatedTotal))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <span>{priorityConfig.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department</span>
                <span>{requisition.department || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Request Date</span>
                <span>{formatDate(requisition.requestDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required By</span>
                <span>{formatDate(requisition.requiredBy)}</span>
              </div>
              {requisition.submittedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted At</span>
                  <span>{formatDate(requisition.submittedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {requisition.justification && (
            <Card>
              <CardHeader>
                <CardTitle>Justification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {requisition.justification}
                </p>
              </CardContent>
            </Card>
          )}

          {requisition.rejectionReason && (
            <Card>
              <CardHeader>
                <CardTitle>Rejection Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600 text-sm">
                  {requisition.rejectionReason}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Notes */}
        {requisition.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {requisition.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </OperationalPageShell>

      {/* Rejection Reason Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setReasonDialogOpen(false);
          }
        }}
        open={reasonDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this requisition.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
              value={reasonText}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setReasonDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!reasonText.trim()}
              onClick={confirmReject}
              variant="destructive"
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
