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
import { ArrowLeft, FileText, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OperationalPageShell } from "../../../components/operational-page-shell";
import { executeCommand } from "@/app/lib/manifest-client";
import { getVendorContract } from "@/app/lib/manifest-client.generated";
import {
  CONTRACT_TYPE_CONFIG,
  formatCurrency,
  formatDate,
  VC_STATUS_CONFIG,
  type VCStatusConfig,
} from "../../components/vc-shared";

interface VendorContract {
  annualSpendCommitment: number;
  approvedAt: string | null;
  approvedBy: string | null;
  autoRenew: boolean;
  complianceScore: number;
  contractNumber: string;
  contractType: string;
  createdAt: string;
  currencyCode: string;
  deliveryTerms: string | null;
  endDate: string | null;
  id: string;
  minimumOrderQuantity: number;
  notes: string | null;
  onTimeDeliveryRate: number;
  paymentTerms: string;
  qualityRating: number;
  renewalTermDays: number;
  slaBreachCount: number;
  startDate: string;
  status: string;
  vendorId: string;
  vendorName: string | null;
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

const getVcStatusConfig = (status: string): VCStatusConfig =>
  VC_STATUS_CONFIG[status] ?? {
    label: status || "Unknown",
    color: "bg-muted/50 text-foreground",
    icon: FileText,
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
      const data = await getVendorContract(id);
      setContract((data as unknown as VendorContract) ?? null);
    } catch (error) {
      console.error("Failed to load contract:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (command: string) => {
    if (!contract) {
      return;
    }
    if (command === "reject" || command === "terminate") {
      setPendingCommand(command);
      setReasonText("");
      setReasonDialogOpen(true);
      return;
    }
    setUpdating(command);
    try {
      await executeCommand("VendorContract", command, { id: contract.id });
      await loadContract();
    } catch (error) {
      console.error(`Failed to execute ${command}:`, error);
    } finally {
      setUpdating(null);
    }
  };

  const confirmReasonAction = async () => {
    if (!(contract && pendingCommand && reasonText.trim())) {
      return;
    }
    const command = pendingCommand;
    setUpdating(command);
    setReasonDialogOpen(false);
    try {
      await executeCommand("VendorContract", command, {
        id: contract.id,
        reason: reasonText.trim(),
      });
      await loadContract();
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

  const config = getVcStatusConfig(contract.status);
  const Icon = config.icon;
  const typeLabel =
    CONTRACT_TYPE_CONFIG[contract.contractType] || contract.contractType;
  const actions = WORKFLOW_ACTIONS[contract.status] || [];

  return (
    <>
    <OperationalPageShell
      actions={
        <>
          <Link href="/procurement/vendor-contracts">
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
      description={`${contract.vendorName || "Unknown Vendor"} · ${formatDate(contract.startDate)} — ${formatDate(contract.endDate)}`}
      eyebrow="Procurement / Vendor contracts"
      title={
        <span className="inline-flex items-center gap-3">
          {contract.contractNumber}
          <Badge className={config.color}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
          <Badge variant="outline">{typeLabel}</Badge>
        </span>
      }
    >

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {contract.complianceScore}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              On-Time Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {Number(contract.onTimeDeliveryRate)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Quality Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {Number(contract.qualityRating)}/5
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">SLA Breaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{contract.slaBreachCount}</div>
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
            <p className="text-muted-foreground text-sm">{contract.notes}</p>
          </CardContent>
        </Card>
      )}

      </OperationalPageShell>

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
    </>
  );
}
