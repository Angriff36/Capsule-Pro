"use client";

import { MonoLabel } from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { AlertTriangle, Loader2, RotateCcw, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface WorkflowPerformance {
  id: string;
  isActive: boolean;
  name: string;
  opened: number;
  openRate: number | null;
  sent: number;
  triggerType: string;
}

interface SmsRuleSummary {
  id: string;
  isActive: boolean;
  name: string;
  triggerType: string;
}

interface AnalyticsData {
  emailPerformanceByWorkflow: WorkflowPerformance[];
  metrics: {
    totalSent: number;
    openRate: number | null;
    bounced: number;
    totalLeads: number;
    conversionRate: number | null;
    totalSms: number;
    smsDeliveryRate: number | null;
    leadsBySource: Record<string, number>;
    activeWorkflows: number;
    activeSmsRules: number;
  };
  smsPerformanceSummary: SmsRuleSummary[];
  window: string;
}

function formatTriggerType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Headline metrics render server-side on the page; this client only fetches
// the windowed performance breakdown.
export function AnalyticsClient() {
  const [windowPeriod, setWindowPeriod] = useState<"30d" | "90d" | "180d">(
    "30d"
  );
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetch(`/api/marketing/analytics?window=${windowPeriod}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error("Request failed");
        }
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => {
        setData(null);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [windowPeriod]);

  const metrics = data?.metrics ?? null;

  const leadsBySource = useMemo(() => {
    if (!metrics?.leadsBySource) {
      return [];
    }
    return Object.entries(metrics.leadsBySource).sort(([, a], [, b]) => b - a);
  }, [metrics]);

  return (
    <div className="space-y-8">
      {/* Window selector */}
      <div className="flex gap-2">
        {(["30d", "90d", "180d"] as const).map((w) => (
          <button
            className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
              windowPeriod === w
                ? "bg-ink text-white"
                : "border border-hairline bg-canvas text-muted-foreground hover:bg-soft-stone"
            }`}
            key={w}
            onClick={() => setWindowPeriod(w)}
            type="button"
          >
            {w === "30d" ? "30 days" : w === "90d" ? "90 days" : "180 days"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center rounded-[22px] border border-hairline border-dashed bg-soft-stone px-6 py-16 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-amber-500/60" />
          <p className="font-medium text-lg">Failed to load analytics</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Something went wrong fetching marketing data. Try again.
          </p>
          <Button
            className="mt-4"
            onClick={fetchData}
            size="sm"
            variant="outline"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {!(loading || error) && metrics && data && (
        <>
          {/* Window-scoped headline metrics */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {[
              {
                label: "Emails sent",
                value:
                  metrics.totalSent > 0 ? String(metrics.totalSent) : "\u2014",
              },
              {
                label: "Open rate",
                value:
                  metrics.openRate === null
                    ? "\u2014"
                    : `${metrics.openRate.toFixed(1)}%`,
              },
              {
                label: "Conversion",
                value:
                  metrics.conversionRate === null
                    ? "\u2014"
                    : `${metrics.conversionRate.toFixed(1)}%`,
              },
              {
                label: "SMS sent",
                value:
                  metrics.totalSms > 0 ? String(metrics.totalSms) : "\u2014",
              },
              {
                label: "SMS delivery",
                value:
                  metrics.smsDeliveryRate === null
                    ? "\u2014"
                    : `${metrics.smsDeliveryRate.toFixed(1)}%`,
              },
              {
                label: "Bounced",
                value: metrics.bounced > 0 ? String(metrics.bounced) : "\u2014",
              },
            ].map((m) => (
              <div
                className="rounded-[22px] border border-hairline bg-canvas p-4"
                key={m.label}
              >
                <MonoLabel>{m.label}</MonoLabel>
                <p className="mt-1 font-medium text-2xl">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Email performance by workflow */}
          {data.emailPerformanceByWorkflow.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MonoLabel>Email performance by workflow</MonoLabel>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
                <div className="grid grid-cols-[1fr_140px_80px_80px_80px] gap-2 border-hairline border-b px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  <span>Workflow</span>
                  <span>Trigger</span>
                  <span>Sent</span>
                  <span>Opened</span>
                  <span>Open rate</span>
                </div>
                <div className="divide-y divide-hairline">
                  {data.emailPerformanceByWorkflow.map((wf) => (
                    <div
                      className="grid grid-cols-[1fr_140px_80px_80px_80px] items-center gap-2 px-4 py-3 text-sm"
                      key={wf.id}
                    >
                      <span className="font-medium">{wf.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatTriggerType(wf.triggerType)}
                      </span>
                      <span className="text-xs">
                        {wf.sent > 0 ? wf.sent : "\u2014"}
                      </span>
                      <span className="text-xs">
                        {wf.opened > 0 ? wf.opened : "\u2014"}
                      </span>
                      <span className="text-xs">
                        {wf.openRate === null
                          ? wf.sent === 0
                            ? "\u2014"
                            : "0%"
                          : `${wf.openRate.toFixed(1)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lead pipeline by source */}
          {leadsBySource.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MonoLabel>Lead pipeline by source</MonoLabel>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
                <div className="grid grid-cols-[1fr_100px] gap-2 border-hairline border-b px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  <span>Source</span>
                  <span>Count</span>
                </div>
                <div className="divide-y divide-hairline">
                  {leadsBySource.map(([source, count]) => (
                    <div
                      className="grid grid-cols-[1fr_100px] items-center gap-2 px-4 py-3 text-sm"
                      key={source}
                    >
                      <span className="font-medium capitalize">{source}</span>
                      <span className="text-xs">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SMS rules summary */}
          {data.smsPerformanceSummary.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <MonoLabel>SMS automation rules</MonoLabel>
              </div>
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
                <div className="grid grid-cols-[1fr_160px_80px] gap-2 border-hairline border-b px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  <span>Rule</span>
                  <span>Trigger</span>
                  <span>Status</span>
                </div>
                <div className="divide-y divide-hairline">
                  {data.smsPerformanceSummary.map((rule) => (
                    <div
                      className="grid grid-cols-[1fr_160px_80px] items-center gap-2 px-4 py-3 text-sm"
                      key={rule.id}
                    >
                      <span className="font-medium">{rule.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatTriggerType(rule.triggerType)}
                      </span>
                      <span
                        className={`inline-flex w-fit rounded-full px-2.5 py-0.5 font-medium text-[11px] uppercase tracking-wide ${
                          rule.isActive
                            ? "bg-ink text-white"
                            : "border border-hairline bg-canvas text-muted-foreground"
                        }`}
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No data empty state */}
          {metrics.totalSent === 0 &&
            metrics.totalLeads === 0 &&
            metrics.totalSms === 0 && (
              <div className="flex flex-col items-center justify-center rounded-[22px] border border-hairline border-dashed bg-soft-stone px-6 py-16 text-center">
                <p className="font-medium text-lg">No data yet</p>
                <p className="mt-1 text-muted-foreground text-sm">
                  Activate a workflow or create leads to begin tracking.
                </p>
                <Button asChild className="mt-4" size="sm" variant="outline">
                  <Link href="/settings/email-workflows">
                    <Settings className="mr-2 h-4 w-4" />
                    Set up email workflows
                  </Link>
                </Button>
              </div>
            )}
        </>
      )}
    </div>
  );
}
