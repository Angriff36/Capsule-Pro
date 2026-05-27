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
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { AlertCircle, ArrowLeft, Calendar, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface PayrollPeriod {
  tenant_id: string;
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-green-100 text-green-800" },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-800",
  },
  closed: { label: "Closed", className: "bg-gray-100 text-gray-800" },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PayrollPeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPeriod = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/payroll/periods/${id}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load payroll period");
      }
      const data = await response.json();
      setPeriod(data.payrollPeriod || data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load period";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPeriod();
  }, [loadPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !period) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <AlertCircle className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">
          {error || "Payroll period not found"}
        </p>
        <Button
          onClick={() => router.push("/payroll/periods")}
          variant="outline"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Periods
        </Button>
      </div>
    );
  }

  const status = statusConfig[period.status] || {
    label: period.status,
    className: "bg-gray-100 text-gray-800",
  };
  const duration = getDaysBetween(period.period_start, period.period_end);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Link href="/payroll/periods">
                <Button size="icon" variant="ghost">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div className="space-y-1">
                <MonoLabel>Payroll</MonoLabel>
                <div className="flex items-center gap-3">
                  <DisplayHeading size="md">Payroll Period</DisplayHeading>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
              </div>
            </div>
            <CommandBandLede>
              {formatDate(period.period_start)} — {formatDate(period.period_end)}
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="size-4" />
                Period Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-normal tracking-[-0.02em]">
                {formatDate(period.period_start)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="size-4" />
                Period End
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-normal tracking-[-0.02em]">
                {formatDate(period.period_end)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="size-4" />
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-normal tracking-[-0.02em]">
                {duration} days
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Period Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Period ID</p>
                <p className="font-mono text-sm">{period.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={status.className}>{status.label}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatDateTime(period.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDateTime(period.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </OperationalColumn>
    </PageCanvas>
  );
}
