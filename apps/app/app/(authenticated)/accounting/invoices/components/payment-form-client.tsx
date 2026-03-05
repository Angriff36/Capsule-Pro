/**
 * Payment Form Component
 *
 * Form for recording and processing payments
 */

"use client";

import {
  AmountInput,
  Button,
  Card,
  Input,
  Label,
  Textarea,
} from "@repo/design-system";
import { Banknote, Building, CreditCard, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PaymentMethodType =
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "ACH"
  | "CHECK"
  | "CASH"
  | "WIRE_TRANSFER"
  | "DIGITAL_WALLET";

interface PaymentFormProps {
  invoiceId: string;
  invoiceTotal: number;
  invoiceAmountDue: number;
  clientId?: string;
}

const paymentMethods: Array<{
  value: PaymentMethodType;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "CREDIT_CARD",
    label: "Credit Card",
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    value: "DEBIT_CARD",
    label: "Debit Card",
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    value: "ACH",
    label: "Bank Transfer (ACH)",
    icon: <Building className="w-4 h-4" />,
  },
  {
    value: "WIRE_TRANSFER",
    label: "Wire Transfer",
    icon: <Building className="w-4 h-4" />,
  },
  { value: "CHECK", label: "Check", icon: <Banknote className="w-4 h-4" /> },
  { value: "CASH", label: "Cash", icon: <Banknote className="w-4 h-4" /> },
  {
    value: "DIGITAL_WALLET",
    label: "Digital Wallet",
    icon: <Smartphone className="w-4 h-4" />,
  },
];

export function PaymentFormClient({
  invoiceId,
  invoiceTotal,
  invoiceAmountDue,
}: PaymentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(invoiceAmountDue);
  const [methodType, setMethodType] =
    useState<PaymentMethodType>("CREDIT_CARD");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [paymentMethodNickname, setPaymentMethodNickname] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create payment
      const response = await fetch("/api/accounting/payments", {
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
            savePaymentMethod,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment");
      }

      const payment = await response.json();

      // Process payment (in real implementation, this would call the payment gateway)
      await fetch(`/api/accounting/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gatewayResponse: {
            code: "200",
            message: "Success",
            transactionId: `txn_${Date.now()}`,
          },
        }),
      });

      // If saving payment method, create tokenized record
      if (savePaymentMethod && paymentMethodNickname) {
        await fetch("/api/accounting/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: "", // Will be derived from invoice
            type: methodType,
            externalMethodId: `pm_${Date.now()}`,
            nickname: paymentMethodNickname,
          }),
        });
      }

      router.push(`/accounting/invoices/${invoiceId}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to process payment:", error);
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">Record Payment</h2>
        <p className="text-gray-500 mt-1">
          Invoice Total:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(invoiceTotal)}
        </p>
      </div>

      <form className="p-6 space-y-6" onSubmit={handleSubmit}>
        {/* Amount */}
        <div>
          <Label htmlFor="amount">Payment Amount</Label>
          <AmountInput
            currency="USD"
            id="amount"
            max={invoiceAmountDue}
            onChange={setAmount}
            placeholder="0.00"
            value={amount}
          />
          <p className="text-sm text-gray-500 mt-1">
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
          <div className="grid grid-cols-2 gap-3 mt-2">
            {paymentMethods.map((method) => (
              <button
                className={`flex items-center gap-2 p-3 border rounded-lg text-left transition-colors ${
                  methodType === method.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
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
            onChange={(e) => setReference(e.target.value)}
            placeholder="Check number, transaction ID, etc."
            value={reference}
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this payment..."
            rows={3}
            value={notes}
          />
        </div>

        {/* Save Payment Method */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2">
            <input
              checked={savePaymentMethod}
              className="rounded"
              id="savePaymentMethod"
              onChange={(e) => setSavePaymentMethod(e.target.checked)}
              type="checkbox"
            />
            <Label className="cursor-pointer" htmlFor="savePaymentMethod">
              Save payment method for future use
            </Label>
          </div>
          {savePaymentMethod && (
            <div className="mt-3">
              <Input
                onChange={(e) => setPaymentMethodNickname(e.target.value)}
                placeholder="Nickname (e.g., 'Company Visa Card')"
                value={paymentMethodNickname}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
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
