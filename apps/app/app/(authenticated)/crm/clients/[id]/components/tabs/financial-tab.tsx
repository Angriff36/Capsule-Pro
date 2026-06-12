"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { CalendarIcon, DollarSignIcon, TrendingUpIcon } from "lucide-react";

interface FinancialTabProps {
  client: {
    totalRevenue: { total: string } | null;
    defaultPaymentTerms: number | null;
    taxExempt: boolean;
    taxId: string | null;
    eventCount: number;
    createdAt: Date;
  };
}

export function FinancialTab({ client }: FinancialTabProps) {
  const totalRevenue = client.totalRevenue
    ? Number(client.totalRevenue.total)
    : 0;

  const avgRevenuePerEvent =
    client.eventCount > 0 ? totalRevenue / client.eventCount : 0;

  const clientYears =
    Math.ceil(
      (Date.now() - new Date(client.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
    ) || 1;

  const annualRevenue = totalRevenue / clientYears;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-xl">Financial Summary</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card tone="soft-stone">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <DollarSignIcon className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              Across {client.eventCount} event
              {client.eventCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>

        <Card tone="soft-stone">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <TrendingUpIcon className="h-4 w-4" />
              Avg per Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              $
              {avgRevenuePerEvent.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              Average event value
            </p>
          </CardContent>
        </Card>

        <Card tone="soft-stone">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <CalendarIcon className="h-4 w-4" />
              Est. Annual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              $
              {annualRevenue.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              ~{clientYears} year{clientYears === 1 ? "" : "s"} as client
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            {client.defaultPaymentTerms ? (
              <div>
                <div className="font-bold text-2xl">
                  Net {client.defaultPaymentTerms}
                </div>
                <p className="text-muted-foreground text-sm">days</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Not specified</p>
            )}
          </CardContent>
        </Card>

        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Tax Status</CardTitle>
          </CardHeader>
          <CardContent>
            {client.taxExempt ? (
              <Badge className="py-1 text-base" variant="secondary">
                Tax Exempt
              </Badge>
            ) : (
              <p className="text-muted-foreground">Standard tax applies</p>
            )}
            {client.taxId && (
              <p className="mt-2 text-muted-foreground text-sm">
                Tax ID: {client.taxId}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card tone="canvas">
        <CardHeader>
          <CardTitle>Lifetime Value Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client since</span>
              <span className="font-medium">
                {new Date(client.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total events</span>
              <span className="font-medium">{client.eventCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lifetime value</span>
              <span className="font-bold text-lg">
                ${totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
