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
import { ArrowLeft, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  formatCurrency,
  formatDate,
  PRIORITY_CONFIG,
  REQ_STATUS_CONFIG,
} from "../../components/req-shared";

interface Requisition {
  id: string;
  requisitionNumber: string;
  status: string;
  priority: string;
  department: string | null;
  requestDate: string;
  requiredBy: string | null;
  justification: string | null;
  subtotal: number;
  estimatedTax: number;
  estimatedShipping: number;
  estimatedTotal: number;
  submittedAt: string | null;
  notes: string | null;
  rejectionReason: string | null;
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
      const res = await apiFetch(`/api/procurement/requisitions/${id}`);
      const data = await res.json();
      if (data.success) {
        setRequisition(data.data.purchaseRequisition);
      }
    } catch (error) {
      console.error("Failed to load requisition:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (command: string) => {
    if (!requisition) return;
    if (command === "reject") {
      setReasonText("");
      setReasonDialogOpen(true);
      return;
    }
    setUpdating(command);
    try {
      const body: Record<string, unknown> = { id: requisition.id };
      const res = await apiFetch(
        `/api/procurement/requisitions/commands/${command}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data.success) {
        await loadRequisition();
      }
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error);
    } finally {
      setUpdating(null);
    }
  };

  const confirmReject = async () => {
    if (!requisition || !reasonText.trim()) return;
    setUpdating("reject");
    setReasonDialogOpen(false);
    try {
      const body: Record<string, unknown> = {
        id: requisition.id,
        reason: reasonText.trim(),
      };
      const res = await apiFetch(
        "/api/procurement/requisitions/commands/reject",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data.success) {
        await loadRequisition();
      }
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

  const config =
    REQ_STATUS_CONFIG[requisition.status] || REQ_STATUS_CONFIG.draft;
  const Icon = config.icon;
  const priorityConfig =
    PRIORITY_CONFIG[requisition.priority] || PRIORITY_CONFIG.normal;
  const actions = WORKFLOW_ACTIONS[requisition.status] || [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/procurement/requisitions">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {requisition.requisitionNumber}
            </h1>
            <Badge className={config.color}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <Badge className={priorityConfig.color} variant="outline">
              {priorityConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {requisition.department || "No department"} &middot;{" "}
            {formatDate(requisition.requestDate)}
          </p>
        </div>
        <div className="flex gap-2">
          {actions.map((action) => (
            <Button
              disabled={updating === action.command}
              key={action.command}
              onClick={() => handleAction(action.command)}
              size="sm"
              variant={action.variant || "default"}
            >
              {updating === action.command && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subtotal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(requisition.subtotal))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(requisition.estimatedTax))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Shipping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(requisition.estimatedShipping))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
              <p className="text-sm text-muted-foreground">
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
              <p className="text-sm text-red-600">
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
            <p className="text-sm text-muted-foreground">{requisition.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) setReasonDialogOpen(false);
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
    </div>
  );
}
