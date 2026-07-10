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
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatCurrency as _formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getPayment,
  paymentProcess,
  paymentRefund,
} from "@/app/lib/manifest-client.generated";

const formatCurrency = (v: string | number | null) =>
  _formatCurrency(v, { nullDisplay: "\u2014" });

interface Payment {
  amount: string;
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  clientId: string | null;
  completedAt: string | null;
  createdAt: string;
  currency: string;
  event?: {
    id: string;
    title: string;
  };
  eventId: string | null;
  gatewayPaymentMethodId: string | null;
  gatewayTransactionId: string | null;
  id: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
  };
  invoiceId: string | null;
  methodType: string;
  processedAt: string | null;
  processor: string | null;
  refundedAt: string | null;
  status: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  PROCESSING: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800",
  },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800" },
  REFUNDED: { label: "Refunded", className: "bg-gray-100 text-gray-800" },
  PARTIALLY_REFUNDED: {
    label: "Partially Refunded",
    className: "bg-orange-100 text-orange-800",
  },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-500" },
};

const methodLabels: Record<string, string> = {
  credit_card: "Credit Card",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  check: "Check",
  other: "Other",
};

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) {
    return "—";
  }
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const loadPayment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPayment(id);
      if (!data) {
        throw new Error("Payment not found");
      }
      setPayment(data as unknown as Payment);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load payment";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  const handleProcess = async () => {
    setActionLoading(true);
    try {
      const result = await paymentProcess({ id });
      setPayment(result as unknown as Payment);
      toast.success("Payment processed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process payment"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefund = async () => {
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }
    if (!refundReason.trim()) {
      toast.error("Refund reason is required");
      return;
    }

    setActionLoading(true);
    try {
      const result = await paymentRefund({ id, reason: refundReason.trim(),
  refundAmount: amount
});
      setPayment(result as unknown as Payment);
      toast.success("Refund processed");
      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundReason("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to refund payment"
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "Payment not found"}</p>
        <Button
          onClick={() => router.push("/accounting/payments")}
          variant="outline"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Payments
        </Button>
      </div>
    );
  }

  const status = statusConfig[payment.status] || {
    label: payment.status,
    className: "bg-gray-100 text-gray-800",
  };
  const methodLabel = methodLabels[payment.methodType] || payment.methodType;

  const canProcess = payment.status === "PENDING";
  const canRefund =
    payment.status === "COMPLETED" || payment.status === "PARTIALLY_REFUNDED";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting/payments">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-2xl tracking-tight">Payment</h1>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <p className="font-mono text-muted-foreground text-sm">
              {payment.id}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canProcess && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={handleProcess}
            >
              <CreditCard className="size-4" />
              Process Payment
            </Button>
          )}
          {canRefund && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={() => {
                setRefundAmount(String(payment.amount));
                setRefundDialogOpen(true);
              }}
              variant="outline"
            >
              <RotateCcw className="size-4" />
              Refund
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <CreditCard className="size-4" />
              Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-2xl">
              {formatCurrency(payment.amount)}
            </p>
            <p className="text-muted-foreground text-xs">
              {payment.currency} · {methodLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <CheckCircle className="size-4" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={status.className}>{status.label}</Badge>
            {payment.processor && (
              <p className="mt-1 text-muted-foreground text-xs">
                via {payment.processor}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Clock className="size-4" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{formatDateTime(payment.createdAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Payment ID</p>
                <p className="font-mono text-sm">{payment.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Method</p>
                <p className="text-sm">{methodLabel}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Currency</p>
                <p className="text-sm">{payment.currency}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Processor</p>
                <p className="text-sm">{payment.processor || "—"}</p>
              </div>
              {payment.gatewayTransactionId && (
                <div className="md:col-span-2">
                  <p className="text-muted-foreground text-sm">
                    Gateway Transaction ID
                  </p>
                  <p className="font-mono text-sm">
                    {payment.gatewayTransactionId}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payment.invoice && (
              <div>
                <p className="text-muted-foreground text-sm">Invoice</p>
                <Link
                  className="font-medium text-sm underline-offset-4 hover:underline"
                  href={`/accounting/invoices/${payment.invoice.id}`}
                >
                  {payment.invoice.invoiceNumber}
                </Link>
              </div>
            )}
            {payment.event && (
              <div>
                <p className="text-muted-foreground text-sm">Event</p>
                <Link
                  className="font-medium text-sm underline-offset-4 hover:underline"
                  href={`/events/${payment.event.id}`}
                >
                  {payment.event.title}
                </Link>
              </div>
            )}
            {payment.client && (
              <div>
                <p className="text-muted-foreground text-sm">Client</p>
                <Link
                  className="font-medium text-sm underline-offset-4 hover:underline"
                  href={`/crm/clients/${payment.client.id}`}
                >
                  {payment.client.company_name ||
                    `${payment.client.first_name || ""} ${payment.client.last_name || ""}`.trim()}
                </Link>
              </div>
            )}
            {!(payment.invoice || payment.event || payment.client) && (
              <p className="text-muted-foreground text-sm">
                No related records
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-100">
                <Clock className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Created</p>
                <p className="text-muted-foreground text-xs">
                  {formatDateTime(payment.createdAt)}
                </p>
              </div>
            </div>

            {payment.processedAt && (
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-yellow-100">
                  <CreditCard className="size-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Processed</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(payment.processedAt)}
                  </p>
                </div>
              </div>
            )}

            {payment.completedAt && (
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="size-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Completed</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(payment.completedAt)}
                  </p>
                </div>
              </div>
            )}

            {payment.refundedAt && (
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-gray-100">
                  <RotateCcw className="size-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Refunded</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(payment.refundedAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog onOpenChange={setRefundDialogOpen} open={refundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund Payment</DialogTitle>
            <DialogDescription>
              Issue a refund for this payment. Original amount:{" "}
              {formatCurrency(payment.amount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refundAmount">Refund Amount ($)</Label>
              <Input
                id="refundAmount"
                max={Number(payment.amount)}
                min="0.01"
                onChange={(e) => setRefundAmount(e.target.value)}
                step="0.01"
                type="number"
                value={refundAmount}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refundReason">Reason</Label>
              <Textarea
                id="refundReason"
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund"
                rows={3}
                value={refundReason}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRefundDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={handleRefund}
              variant="destructive"
            >
              {actionLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
