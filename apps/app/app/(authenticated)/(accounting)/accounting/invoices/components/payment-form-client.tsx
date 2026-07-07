/**
 * Payment Form Component
 *
 * Form for recording and processing payments
 */

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Banknote, Building, CreditCard, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
// NOTE: Keeping apiFetch for payment create (POST /api/accounting/payments) and payment process
// (PUT /api/accounting/payments/:id) — generated client has no paymentCreate, and paymentProcess
// only operates on an existing payment record.
import { apiFetch } from "@/app/lib/api";

type PaymentMethodType =
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "ACH"
  | "CHECK"
  | "CASH"
  | "WIRE_TRANSFER"
  | "DIGITAL_WALLET";

interface PaymentFormProps {
  clientId?: string;
  invoiceAmountDue: number;
  invoiceId: string;
  invoiceTotal: number;
}

const paymentMethods: Array<{
  value: PaymentMethodType;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "CREDIT_CARD",
    label: "Credit Card",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    value: "DEBIT_CARD",
    label: "Debit Card",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    value: "ACH",
    label: "Bank Transfer (ACH)",
    icon: <Building className="h-4 w-4" />,
  },
  {
    value: "WIRE_TRANSFER",
    label: "Wire Transfer",
    icon: <Building className="h-4 w-4" />,
  },
  { value: "CHECK", label: "Check", icon: <Banknote className="h-4 w-4" /> },
  { value: "CASH", label: "Cash", icon: <Banknote className="h-4 w-4" /> },
  {
    value: "DIGITAL_WALLET",
    label: "Digital Wallet",
    icon: <Smartphone className="h-4 w-4" />,
  },
];

export function PaymentFormClient({
  invoiceId,
  invoiceTotal,
  invoiceAmountDue,
}: PaymentFormProps) {
  const posthog = usePostHog();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(invoiceAmountDue);
  const [methodType, setMethodType] =
    useState<PaymentMethodType>("CREDIT_CARD");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      posthog?.capture("billing:checkout_started", {
        plan: "invoice_payment",
        interval: "one_time",
        amount_cents: Math.round(amount * 100),
        payment_method: methodType,
      });

      // Create payment
      const response = await apiFetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          eventId: "", // Will be derived from invoice
          amount,
          methodType,
          description: notes,
          metadata: {
            reference,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment");
      }

      const payment = await response.json();

      // Process payment through server-side gateway.
      // The server PUT handler calls processPaymentGateway() exclusively —
      // it does NOT read the request body for gateway results or transaction IDs.
      // All gateway interaction (transaction ID generation, success/failure
      // determination) happens server-side.
      const processResponse = await apiFetch(
        `/api/accounting/payments/${payment.id}`,
        {
          method: "PUT",
        }
      );

      if (!processResponse.ok) {
        throw new Error("Failed to process payment through gateway");
      }

      posthog?.capture("billing:checkout_completed", {
        plan: "invoice_payment",
        interval: "one_time",
        amount_cents: Math.round(amount * 100),
        payment_method: methodType,
      });

      router.push(`/accounting/invoices/${invoiceId}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to process payment:", error);
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <div className="border-b p-6">
        <h2 className="font-bold text-xl">Record Payment</h2>
        <p className="mt-1 text-gray-500">
          Invoice Total:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(invoiceTotal)}
        </p>
      </div>

      <form className="space-y-6 p-6" onSubmit={handleSubmit}>
        {/* Amount */}
        <div>
          <Label htmlFor="amount">Payment Amount</Label>
          <Input
            id="amount"
            max={invoiceAmountDue}
            min={0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setAmount(Number(e.target.value))
            }
            placeholder="0.00"
            step={0.01}
            type="number"
            value={amount}
          />
          <p className="mt-1 text-gray-500 text-sm">
            Amount Due:{" "}
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(invoiceAmountDue)}
          </p>
        </div>

        {/* Payment Method */}
        <div>
          <Label htmlFor="methodType">Payment Method</Label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <button
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                  methodType === method.value
                    ? "border-primary bg-muted/50"
                    : "border-muted hover:border-muted-foreground"
                }`}
                key={method.value}
                onClick={() => setMethodType(method.value)}
                type="button"
              >
                {method.icon}
                <span>{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reference Number */}
        <div>
          <Label htmlFor="reference">Reference Number (Optional)</Label>
          <Input
            id="reference"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setReference(e.target.value)
            }
            placeholder="Check number, transaction ID, etc."
            value={reference}
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setNotes(e.target.value)
            }
            placeholder="Add any notes about this payment..."
            rows={3}
            value={notes}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t pt-4">
          <Button
            disabled={loading}
            onClick={() => router.back()}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={loading || amount <= 0} type="submit">
            {loading
              ? "Processing..."
              : `Record Payment of ${new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(amount)}`}
          </Button>
        </div>
      </form>
    </Card>
  );
}
