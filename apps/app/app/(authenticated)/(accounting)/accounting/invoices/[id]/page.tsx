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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { formatCurrency as _formatCurrency } from "@repo/design-system/lib/format-currency";
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
import { PermissionGate } from "@/app/components/permission-gate";
import { StatusTransitionBadge } from "@/app/components/status-transition-badge";
import {
  getInvoice,
  invoiceApplyPayment,
  invoiceMarkAsPaid,
  invoiceMarkOverdue,
  invoiceSend,
  invoiceSendReminder,
  invoiceVoidInvoice,
} from "@/app/lib/manifest-client.generated";

const formatCurrency = (v: string | number | null) =>
  _formatCurrency(v, { nullDisplay: "\u2014" });

interface InvoiceClient {
  company_name: string | null;
  email: string | null;
  first_name: string | null;
  id: string;
  last_name: string | null;
}

interface InvoiceEvent {
  eventDate: string | null;
  id: string;
  title: string;
}

interface InvoiceLineItem {
  amount: number;
  description: string;
  id: string;
  quantity: number;
  taxRate: number;
  unitPrice: number;
}

interface Invoice {
  amountDue: string;
  amountPaid: string;
  client?: InvoiceClient;
  clientId: string | null;
  createdAt: string;
  depositPaid: string | null;
  depositPercentage: string | null;
  depositRequired: string | null;
  discountAmount: string;
  dueDate: string | null;
  event?: InvoiceEvent;
  eventId: string | null;
  id: string;
  internalNotes: string | null;
  invoiceNumber: string;
  invoiceType: string;
  issuedAt: string | null;
  lineItems: InvoiceLineItem[];
  notes: string | null;
  paidAt: string | null;
  paymentTerms: number | null;
  sentAt: string | null;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  updatedAt: string;
}

const typeLabels: Record<string, string> = {
  DEPOSIT: "Deposit",
  FINAL_PAYMENT: "Final Payment",
  PROGRESS: "Progress",
  MISC: "Miscellaneous",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) {
    return "—";
  }
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
      const data = await getInvoice(id);
      if (!data) {
        throw new Error("Invoice not found");
      }
      setInvoice(data as unknown as Invoice);
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
      let result: unknown;
      switch (action) {
        case "apply-payment":
          result = await invoiceApplyPayment({
            id,
            paymentAmount: Number(body?.amount),
          });
          break;
        case "mark-as-paid":
          result = await invoiceMarkAsPaid({ id });
          break;
        case "send-reminder":
          result = await invoiceSendReminder({ id });
          break;
        case "mark-overdue":
          result = await invoiceMarkOverdue({ id });
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      setInvoice(result as unknown as Invoice);
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
      const result = await invoiceSend({ id });
      setInvoice(result as unknown as Invoice);
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
      const result = await invoiceVoidInvoice({ id });
      setInvoice(result as unknown as Invoice);
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
              <h1 className="font-semibold text-2xl tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              <StatusTransitionBadge
                entity="Invoice"
                id={id}
                onChanged={() => loadInvoice()}
                status={invoice.status}
              />
              <Badge variant="outline">{typeLabel}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
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
            // PermissionGate is presentation-only; the authoritative check stays
            // on the governed `voidInvoice` command (route/runtime guard). This is
            // a "use client" route entry with no server parent, and the app has no
            // client-exposed role source — so, matching every other PermissionGate
            // call site in this codebase, the role is passed as "admin". When a
            // client role channel exists (e.g. a useCurrentUser hook), swap it in.
            <PermissionGate
              action="void invoices"
              allow="manager"
              userRole="admin"
            >
              <Button
                className="gap-1"
                disabled={actionLoading}
                onClick={() => setVoidDialogOpen(true)}
                variant="destructive"
              >
                <Ban className="size-4" />
                Void
              </Button>
            </PermissionGate>
          )}
        </div>
      </div>

      <Separator />

      {/* Financial Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <DollarSign className="size-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-2xl">
              {formatCurrency(invoice.total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <CheckCircle className="size-4" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-2xl text-green-600">
              {formatCurrency(invoice.amountPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Clock className="size-4" />
              Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`font-semibold text-2xl ${Number(invoice.amountDue) > 0 ? "text-orange-600" : ""}`}
            >
              {formatCurrency(invoice.amountDue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Payment Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-2xl">
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
              <p className="text-muted-foreground text-sm">Client</p>
              {invoice.client ? (
                <Link
                  className="font-medium text-sm underline-offset-4 hover:underline"
                  href={`/crm/clients/${invoice.client.id}`}
                >
                  {clientName}
                </Link>
              ) : (
                <p className="text-sm">—</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Event</p>
              {invoice.event ? (
                <Link
                  className="font-medium text-sm underline-offset-4 hover:underline"
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.taxRate}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
          {invoice.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">
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
