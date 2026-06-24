"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import {
  BulkActionBar,
  useBulkSelection,
} from "@/app/components/bulk-actions";
import { StatusTransitionBadge } from "@/app/components/status-transition-badge";

interface Invoice {
  amountDue: number | string;
  createdAt: string;
  dueDate: string;
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  total: number | string;
}

type StatusVariant =
  | "default"
  | "secondary"
  | "outline"
  | "solid"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "coral";

const statusColors: Record<string, StatusVariant> = {
  DRAFT: "secondary",
  SENT: "info",
  VIEWED: "info",
  PAID: "success",
  OVERDUE: "destructive",
  VOID: "outline",
  WRITE_OFF: "outline",
  PARTIALLY_PAID: "warning",
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const posthog = usePostHog();
  const router = useRouter();

  const {
    selectedIds,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  } = useBulkSelection(invoices.map((i) => i.id));

  useEffect(() => {
    posthog?.capture("billing:invoice_viewed", {
      invoice_count: invoices.length,
    });
  }, [posthog, invoices.length]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and track all invoices</p>
        </div>
        <Button onClick={() => router.push("/accounting/invoices/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium text-lg">No invoices yet</h3>
            <p className="mt-1 text-muted-foreground text-sm">
              Create your first invoice to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Checkbox
                aria-label="Select all invoices"
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                onCheckedChange={() => toggleAll()}
              />
              <CardTitle>All Invoices ({invoices.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  key={inv.id}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      aria-label={`Select invoice ${inv.invoiceNumber}`}
                      checked={isSelected(inv.id)}
                      onCheckedChange={() => toggle(inv.id)}
                    />
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(inv.createdAt)} · Due{" "}
                        {formatDate(inv.dueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusTransitionBadge
                      entity="Invoice"
                      id={inv.id}
                      onChanged={() => router.refresh()}
                      status={inv.status}
                      variant={statusColors[inv.status] ?? "default"}
                    />
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(inv.total)}</p>
                      {Number(inv.amountDue) > 0 && (
                        <p className="text-muted-foreground text-xs">
                          Due: {formatCurrency(inv.amountDue)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <BulkActionBar
        actions={[
          { command: "send", label: "Send" },
          { command: "markOverdue", label: "Mark Overdue" },
          {
            command: "voidInvoice",
            confirm: "Void {count} invoice(s)? This cannot be undone.",
            label: "Void",
            variant: "destructive",
          },
        ]}
        entity="Invoice"
        onClear={clear}
        onDone={() => router.refresh()}
        selectedIds={selectedIds}
      />
    </div>
  );
}
