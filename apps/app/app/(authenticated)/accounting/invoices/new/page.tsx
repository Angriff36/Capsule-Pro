"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

const INVOICE_TYPES = [
  { value: "DEPOSIT", label: "Deposit" },
  { value: "FINAL_PAYMENT", label: "Final Payment" },
  { value: "PROGRESS", label: "Progress" },
  { value: "MISC", label: "Miscellaneous" },
  { value: "CREDIT_NOTE", label: "Credit Note" },
  { value: "DEBIT_NOTE", label: "Debit Note" },
];

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

function createEmptyLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
  };
}

function getLineItemAmount(item: LineItem): number {
  const subtotal = item.quantity * item.unitPrice;
  return subtotal + subtotal * (item.taxRate / 100);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [eventId, setEventId] = useState("");
  const [clientId, setClientId] = useState("");
  const [invoiceType, setInvoiceType] = useState("FINAL_PAYMENT");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [dueDate, setDueDate] = useState("");
  const [depositPercentage, setDepositPercentage] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const addLineItem = () => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLineItem = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + getLineItemAmount(item),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId.trim()) {
      toast.error("Event ID is required");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        eventId: eventId.trim(),
        invoiceType,
        paymentTerms: Number(paymentTerms) || 30,
      };

      if (clientId.trim()) body.clientId = clientId.trim();
      if (dueDate) body.dueDate = dueDate;
      if (notes.trim()) body.notes = notes.trim();
      if (internalNotes.trim()) body.internalNotes = internalNotes.trim();
      if (invoiceType === "DEPOSIT" && depositPercentage) {
        body.depositPercentage = Number(depositPercentage);
      }

      if (lineItems.length > 0) {
        body.lineItems = lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          amount: getLineItemAmount(item),
        }));
      }

      const response = await apiFetch("/api/accounting/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create invoice");
      }

      const invoice = await response.json();
      toast.success("Invoice created");
      router.push(`/accounting/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/accounting/invoices">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New Invoice</h1>
      </div>

      <Separator />

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eventId">Event ID *</Label>
                <Input
                  id="eventId"
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="Enter event ID"
                  required
                  value={eventId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Optional — defaults to event client"
                  value={clientId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <Select onValueChange={setInvoiceType} value={invoiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
                  <Input
                    id="paymentTerms"
                    min={0}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    type="number"
                    value={paymentTerms}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    onChange={(e) => setDueDate(e.target.value)}
                    type="date"
                    value={dueDate}
                  />
                </div>
              </div>

              {invoiceType === "DEPOSIT" && (
                <div className="space-y-2">
                  <Label htmlFor="depositPercentage">
                    Deposit Percentage (%)
                  </Label>
                  <Input
                    id="depositPercentage"
                    max={100}
                    min={0}
                    onChange={(e) => setDepositPercentage(e.target.value)}
                    type="number"
                    value={depositPercentage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Client Notes</Label>
                <Textarea
                  id="notes"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes visible to the client"
                  rows={4}
                  value={notes}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalNotes">Internal Notes</Label>
                <Textarea
                  id="internalNotes"
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes (not visible to client)"
                  rows={4}
                  value={internalNotes}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button
              className="gap-1"
              onClick={addLineItem}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus className="size-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No line items added. Click "Add Item" or submit without line
                items to create a draft.
              </p>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item) => (
                  <div
                    className="grid grid-cols-[1fr_80px_100px_80px_auto] items-end gap-2"
                    key={item.id}
                  >
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        onChange={(e) =>
                          updateLineItem(item.id, "description", e.target.value)
                        }
                        placeholder="Item description"
                        value={item.description}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input
                        min={0}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "quantity",
                            Number(e.target.value) || 0
                          )
                        }
                        type="number"
                        value={item.quantity}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        min={0}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "unitPrice",
                            Number(e.target.value) || 0
                          )
                        }
                        step="0.01"
                        type="number"
                        value={item.unitPrice}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tax %</Label>
                      <Input
                        max={100}
                        min={0}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "taxRate",
                            Number(e.target.value) || 0
                          )
                        }
                        type="number"
                        value={item.taxRate}
                      />
                    </div>
                    <Button
                      onClick={() => removeLineItem(item.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}

                <Separator />

                <div className="flex justify-end">
                  <p className="text-sm text-muted-foreground">
                    Total:{" "}
                    <span className="font-semibold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(totalAmount)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/accounting/invoices">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button disabled={submitting} type="submit">
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
