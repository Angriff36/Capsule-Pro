"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect } from "react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  total: number | string;
  amountDue: number | string;
  dueDate: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "secondary",
  SENT: "default",
  VIEWED: "default",
  PAID: "default",
  OVERDUE: "destructive",
  VOIDED: "outline",
  PARTIALLY_PAID: "default",
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

  useEffect(() => {
    posthog?.capture("billing:invoice_viewed", {
      invoice_count: invoices.length,
    });
  }, [posthog, invoices.length]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
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
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No invoices yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create your first invoice to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Invoices ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  key={inv.id}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.createdAt)} · Due{" "}
                        {formatDate(inv.dueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        (statusColors[inv.status] as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline") || "default"
                      }
                    >
                      {inv.status}
                    </Badge>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(inv.total)}</p>
                      {Number(inv.amountDue) > 0 && (
                        <p className="text-xs text-muted-foreground">
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
    </div>
  );
}
