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
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Loader2,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { formatCurrency as _formatCurrency } from "@repo/design-system/lib/format-currency";

const formatCurrency = (v: string | number | null) =>
  _formatCurrency(v, { nullDisplay: "\u2014" });

interface InvoiceClient {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface InvoiceEvent {
  id: string;
  title: string;
  eventDate: string | null;
}

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  clientId: string | null;
  eventId: string | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  amountPaid: string;
  amountDue: string;
  depositPercentage: string | null;
  depositRequired: string | null;
  depositPaid: string | null;
  paymentTerms: number | null;
  dueDate: string | null;
  paidAt: string | null;
  issuedAt: string | null;
  sentAt: string | null;
  notes: string | null;
  internalNotes: string | null;
  lineItems: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
  client?: InvoiceClient;
  event?: InvoiceEvent;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-800" },
  VIEWED: { label: "Viewed", className: "bg-blue-100 text-blue-800" },
  OVERDUE: { label: "Overdue", className: "bg-red-100 text-red-800" },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    className: "bg-orange-100 text-orange-800",
  },
  PAID: { label: "Paid", className: "bg-green-100 text-green-800" },
  VOID: { label: "Void", className: "bg-gray-100 text-gray-500" },
  WRITE_OFF: { label: "Written Off", className: "bg-red-100 text-red-800" },
};

const typeLabels: Record<string, string> = {
  DEPOSIT: "Deposit",
  FINAL_PAYMENT: "Final Payment",
  PROGRESS: "Progress",
  MISC: "Miscellaneous",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};


const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/accounting/invoices/${id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load invoice");
      }
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load invoice";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleAction = async (
    action: string,
    body?: Record<string, unknown>
  ) => {
    setActionLoading(true);
    try {
      const response = await apiFetch(`/api/accounting/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action}`);
      }

      const updated = await response.json();
      setInvoice(updated);
      toast.success(`Invoice ${action.replace(/-/g, " ")}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = async () => {
    setActionLoading(true);
    try {
      const response = await apiFetch(`/api/accounting/invoices/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send invoice");
      }
      const updated = await response.json();
      setInvoice(updated);
      toast.success("Invoice sent to client");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send invoice"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    setActionLoading(true);
    try {
      const response = await apiFetch(`/api/accounting/invoices/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to void invoice");
      }
      const updated = await response.json();
      setInvoice(updated);
      toast.success("Invoice voided");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to void invoice"
      );
    } finally {
      setActionLoading(false);
      setVoidDialogOpen(false);
    }
  };

  const handleApplyPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    await handleAction("apply-payment", { amount });
    setPaymentDialogOpen(false);
    setPaymentAmount("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "Invoice not found"}</p>
        <Button
          onClick={() => router.push("/accounting/invoices")}
          variant="outline"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || {
    label: invoice.status,
    className: "bg-gray-100 text-gray-800",
  };
  const typeLabel = typeLabels[invoice.invoiceType] || invoice.invoiceType;

  const canSend = invoice.status === "DRAFT";
  const canApplyPayment = [
    "SENT",
    "VIEWED",
    "OVERDUE",
    "PARTIALLY_PAID",
  ].includes(invoice.status);
  const canMarkPaid = ["SENT", "VIEWED", "OVERDUE", "PARTIALLY_PAID"].includes(
    invoice.status
  );
  const canMarkOverdue = ["SENT", "VIEWED"].includes(invoice.status);
  const canSendReminder = [
    "SENT",
    "VIEWED",
    "OVERDUE",
    "PARTIALLY_PAID",
  ].includes(invoice.status);
  const canVoid = invoice.status === "DRAFT";

  const clientName = invoice.client
    ? invoice.client.company_name ||
      `${invoice.client.first_name || ""} ${invoice.client.last_name || ""}`.trim() ||
      invoice.client.email
    : "—";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/accounting/invoices">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <Badge className={status.className}>{status.label}</Badge>
              <Badge variant="outline">{typeLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(invoice.createdAt)}
              {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {canSend && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={handleSend}
            >
              <Mail className="size-4" />
              Send
            </Button>
          )}
          {canApplyPayment && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={() => setPaymentDialogOpen(true)}
              variant="outline"
            >
              <CreditCard className="size-4" />
              Apply Payment
            </Button>
          )}
          {canMarkPaid && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={() => handleAction("mark-as-paid")}
              variant="outline"
            >
              <CheckCircle className="size-4" />
              Mark Paid
            </Button>
          )}
          {canSendReminder && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={() => handleAction("send-reminder")}
              variant="outline"
            >
              <Mail className="size-4" />
              Send Reminder
            </Button>
          )}
          {canMarkOverdue && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={() => handleAction("mark-overdue")}
              variant="outline"
            >
              <AlertTriangle className="size-4" />
              Mark Overdue
            </Button>
          )}
          {canVoid && (
            <Button
              className="gap-1"
              disabled={actionLoading}
              onClick={() => setVoidDialogOpen(true)}
              variant="destructive"
            >
              <Ban className="size-4" />
              Void
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="size-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(invoice.total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle className="size-4" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">
              {formatCurrency(invoice.amountPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" />
              Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-semibold ${Number(invoice.amountDue) > 0 ? "text-orange-600" : ""}`}
            >
              {formatCurrency(invoice.amountDue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {invoice.paymentTerms ?? "—"} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client & Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              {invoice.client ? (
                <Link
                  className="text-sm font-medium underline-offset-4 hover:underline"
                  href={`/crm/clients/${invoice.client.id}`}
                >
                  {clientName}
                </Link>
              ) : (
                <p className="text-sm">—</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Event</p>
              {invoice.event ? (
                <Link
                  className="text-sm font-medium underline-offset-4 hover:underline"
                  href={`/events/${invoice.event.id}`}
                >
                  {invoice.event.title}
                  {invoice.event.eventDate &&
                    ` — ${formatDate(invoice.event.eventDate)}`}
                </Link>
              ) : (
                <p className="text-sm">—</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(invoice.taxAmount)}</span>
              </div>
              {Number(invoice.discountAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              {invoice.depositRequired &&
                Number(invoice.depositRequired) > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Deposit Required
                      </span>
                      <span>
                        {formatCurrency(invoice.depositRequired)}
                        {invoice.depositPercentage &&
                          ` (${invoice.depositPercentage}%)`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Deposit Paid
                      </span>
                      <span>{formatCurrency(invoice.depositPaid)}</span>
                    </div>
                  </>
                )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      {invoice.lineItems && invoice.lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Description</th>
                    <th className="pb-2 pr-4 text-right font-medium">Qty</th>
                    <th className="pb-2 pr-4 text-right font-medium">
                      Unit Price
                    </th>
                    <th className="pb-2 pr-4 text-right font-medium">Tax</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr className="border-b last:border-0" key={item.id}>
                      <td className="py-2 pr-4">{item.description}</td>
                      <td className="py-2 pr-4 text-right">{item.quantity}</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-2 pr-4 text-right">{item.taxRate}%</td>
                      <td className="py-2 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(invoice.notes || invoice.internalNotes) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
          {invoice.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {invoice.internalNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Apply Payment Dialog */}
      <Dialog onOpenChange={setPaymentDialogOpen} open={paymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Payment</DialogTitle>
            <DialogDescription>
              Record a payment against this invoice. Amount due:{" "}
              {formatCurrency(invoice.amountDue)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount ($)</Label>
              <Input
                id="paymentAmount"
                max={Number(invoice.amountDue)}
                min="0.01"
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={paymentAmount}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setPaymentDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={actionLoading} onClick={handleApplyPayment}>
              {actionLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Apply Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog onOpenChange={setVoidDialogOpen} open={voidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to void invoice {invoice.invoiceNumber}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setVoidDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={actionLoading}
              onClick={handleVoid}
              variant="destructive"
            >
              {actionLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Void Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
