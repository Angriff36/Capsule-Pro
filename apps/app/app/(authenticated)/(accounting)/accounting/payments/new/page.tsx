/**
 * @module NewPaymentPage
 * @intent Create and submit a new payment record
 * @responsibility Form for recording payments against invoices with validation
 * @domain Accounting
 * @tags payments, create, accounting, form
 * @canonical true
 */

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for payment create (POST /api/accounting/payments) — generated client
// has no paymentCreate function.
import { apiFetch } from "@/app/lib/api";

const METHOD_TYPE_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "ACH", label: "ACH Transfer" },
  { value: "WIRE_TRANSFER", label: "Wire Transfer" },
  { value: "DIGITAL_WALLET", label: "Digital Wallet" },
] as const;

interface FormData {
  amount: string;
  currency: string;
  eventId: string;
  invoiceId: string;
  methodType: string;
  processor: string;
  reference: string;
}

const INITIAL_FORM: FormData = {
  amount: "",
  methodType: "",
  currency: "USD",
  invoiceId: "",
  eventId: "",
  processor: "",
  reference: "",
};

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = Number.parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }

    if (!formData.invoiceId.trim()) {
      toast.error("Invoice ID is required");
      return;
    }

    if (!formData.eventId.trim()) {
      toast.error("Event ID is required");
      return;
    }

    if (!formData.methodType) {
      toast.error("Payment method is required");
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          methodType: formData.methodType,
          currency: formData.currency || "USD",
          invoiceId: formData.invoiceId.trim(),
          eventId: formData.eventId.trim(),
          processor: formData.processor.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || "Failed to create payment"
        );
      }

      toast.success("Payment recorded successfully");
      router.push("/accounting/payments");
    } catch (error) {
      toast.error("Failed to create payment", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/accounting/payments">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">
            Record Payment
          </h1>
          <p className="text-muted-foreground">
            Create a new payment record against an invoice.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Enter the payment information. Invoice and Event IDs are required
              to associate this payment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount and Currency */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  min="0.01"
                  onChange={(e) => updateField("amount", e.target.value)}
                  placeholder="0.00"
                  required
                  step="0.01"
                  type="number"
                  value={formData.amount}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  maxLength={3}
                  onChange={(e) =>
                    updateField("currency", e.target.value.toUpperCase())
                  }
                  placeholder="USD"
                  value={formData.currency}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="methodType">Payment Method *</Label>
                <Select
                  onValueChange={(value) => updateField("methodType", value)}
                  value={formData.methodType}
                >
                  <SelectTrigger id="methodType">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Invoice and Event references */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoiceId">Invoice ID *</Label>
                <Input
                  id="invoiceId"
                  onChange={(e) => updateField("invoiceId", e.target.value)}
                  placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
                  required
                  value={formData.invoiceId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventId">Event ID *</Label>
                <Input
                  id="eventId"
                  onChange={(e) => updateField("eventId", e.target.value)}
                  placeholder="e.g., 6ba7b810-9dad-11d1-80b4-00c04fd430c8"
                  required
                  value={formData.eventId}
                />
              </div>
            </div>

            {/* Processor and Reference */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="processor">Processor</Label>
                <Input
                  id="processor"
                  onChange={(e) => updateField("processor", e.target.value)}
                  placeholder="e.g., stripe, square"
                  value={formData.processor}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference / Notes</Label>
                <Textarea
                  id="reference"
                  onChange={(e) => updateField("reference", e.target.value)}
                  placeholder="Check number, transaction reference, or internal notes..."
                  rows={1}
                  value={formData.reference}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-2">
              <Button asChild type="button" variant="outline">
                <Link href="/accounting/payments">Cancel</Link>
              </Button>
              <Button disabled={loading} type="submit">
                {loading && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Record Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
