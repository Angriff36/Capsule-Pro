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
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  CONTRACT_TYPE_CONFIG,
  formatCurrency,
  formatDate,
  VC_STATUS_CONFIG,
} from "../../components/vc-shared";

interface VendorContract {
  id: string;
  contractNumber: string;
  vendorId: string;
  vendorName: string | null;
  contractType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  renewalTermDays: number;
  paymentTerms: string;
  deliveryTerms: string | null;
  minimumOrderQuantity: number;
  annualSpendCommitment: number;
  currencyCode: string;
  complianceScore: number;
  slaBreachCount: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

const WORKFLOW_ACTIONS: Record<
  string,
  { label: string; command: string; variant?: "default" | "destructive" }[]
> = {
  draft: [{ label: "Submit for Approval", command: "submit" }],
  pending_approval: [
    { label: "Approve", command: "approve" },
    { label: "Reject", command: "reject", variant: "destructive" },
  ],
  active: [
    { label: "Terminate", command: "terminate", variant: "destructive" },
    { label: "Renew", command: "renew" },
  ],
};

export default function VendorContractDetailPage() {
  const params = useParams();
  const id = (params?.id ?? "") as string;

  const [contract, setContract] = useState<VendorContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);

  useEffect(() => {
    loadContract();
  }, [id]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/procurement/vendor-contracts/${id}`);
      const data = await res.json();
      if (data.success) {
        setContract(data.data.vendorContract);
      }
    } catch (error) {
      console.error("Failed to load contract:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (command: string) => {
    if (!contract) return;
    if (command === "reject" || command === "terminate") {
      setPendingCommand(command);
      setReasonText("");
      setReasonDialogOpen(true);
      return;
    }
    setUpdating(command);
    try {
      const body: Record<string, unknown> = { id: contract.id };
      const res = await apiFetch(
        `/api/procurement/vendor-contracts/commands/${command}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data.success) {
        await loadContract();
      }
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error);
    } finally {
      setUpdating(null);
    }
  };

  const confirmReasonAction = async () => {
    if (!(contract && pendingCommand && reasonText.trim())) return;
    const command = pendingCommand;
    setUpdating(command);
    setReasonDialogOpen(false);
    try {
      const body: Record<string, unknown> = {
        id: contract.id,
        reason: reasonText.trim(),
      };
      const res = await apiFetch(
        `/api/procurement/vendor-contracts/commands/${command}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (data.success) {
        await loadContract();
      }
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error);
    } finally {
      setUpdating(null);
      setPendingCommand(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Contract not found.</p>
        <Link href="/procurement/vendor-contracts">
          <Button className="mt-4" variant="outline">
            Back to Vendor Contracts
          </Button>
        </Link>
      </div>
    );
  }

  const config = VC_STATUS_CONFIG[contract.status] || VC_STATUS_CONFIG.draft;
  const Icon = config.icon;
  const typeLabel =
    CONTRACT_TYPE_CONFIG[contract.contractType] || contract.contractType;
  const actions = WORKFLOW_ACTIONS[contract.status] || [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/procurement/vendor-contracts">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {contract.contractNumber}
            </h1>
            <Badge className={config.color}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <Badge variant="outline">{typeLabel}</Badge>
          </div>
          <p className="text-muted-foreground">
            {contract.vendorName || "Unknown Vendor"} &middot;{" "}
            {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
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
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contract.complianceScore}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              On-Time Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(contract.onTimeDeliveryRate)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(contract.qualityRating)}/5
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contract.slaBreachCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contract Number</span>
              <span className="font-medium">{contract.contractNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor</span>
              <span>{contract.vendorName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{typeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms</span>
              <span>{contract.paymentTerms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto-Renew</span>
              <span>{contract.autoRenew ? "Yes" : "No"}</span>
            </div>
            {contract.autoRenew && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Renewal Term</span>
                <span>{contract.renewalTermDays} days</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span>{contract.currencyCode}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Terms & Commitments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date</span>
              <span>{formatDate(contract.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date</span>
              <span>{formatDate(contract.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Min. Order Qty</span>
              <span>
                {formatCurrency(Number(contract.minimumOrderQuantity))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Annual Spend Commitment
              </span>
              <span>
                {formatCurrency(Number(contract.annualSpendCommitment))}
              </span>
            </div>
            {contract.deliveryTerms && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Terms</span>
                <span>{contract.deliveryTerms}</span>
              </div>
            )}
            {contract.approvedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved</span>
                <span>{formatDate(contract.approvedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {contract.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{contract.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Reason Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setReasonDialogOpen(false);
            setPendingCommand(null);
          }
        }}
        open={reasonDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingCommand === "reject"
                ? "Reject Contract"
                : "Terminate Contract"}
            </DialogTitle>
            <DialogDescription>
              {pendingCommand === "reject"
                ? "Provide a reason for rejecting this contract."
                : "Provide a reason for terminating this contract."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              onChange={(e) => setReasonText(e.target.value)}
              placeholder={
                pendingCommand === "reject"
                  ? "Enter rejection reason..."
                  : "Enter termination reason..."
              }
              rows={3}
              value={reasonText}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setReasonDialogOpen(false);
                setPendingCommand(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!reasonText.trim()}
              onClick={confirmReasonAction}
              variant="destructive"
            >
              {pendingCommand === "reject" ? "Reject" : "Terminate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
