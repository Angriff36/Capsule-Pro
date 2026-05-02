"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  OperationalRow,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { DollarSign, Eye, FileText, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import {
  formatCurrency,
  formatDateShort,
  PRIORITY_CONFIG,
  REQ_STATUS_CONFIG,
} from "../components/req-shared";

interface Requisition {
  id: string;
  requisitionNumber: string;
  status: string;
  priority: string;
  department: string | null;
  requestDate: string;
  requiredBy: string | null;
  subtotal: number;
  estimatedTotal: number;
  justification: string | null;
  notes: string | null;
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadRequisitions();
  }, []);

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/procurement/requisitions/list");
      const data = await res.json();
      if (data.success) {
        setRequisitions(data.data.purchaseRequisitions || []);
      }
    } catch (error) {
      console.error("Failed to load requisitions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesTab = activeTab === "all" || r.status === activeTab;
      const matchesSearch =
        !searchQuery ||
        r.requisitionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [requisitions, activeTab, searchQuery]);

  if (loading) {
    return (
      <PageCanvas>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageCanvas>
    );
  }

  const workflowMetrics = (
    ["pending_manager", "pending_finance", "approved", "rejected"] as const
  ).map((status) => {
    const config = REQ_STATUS_CONFIG[status];
    const count = requisitions.filter((r) => r.status === status).length;
    return { status, config, count };
  });

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Procurement / Requisitions</MonoLabel>
            <DisplayHeading size="md">Purchase requests</DisplayHeading>
            <CommandBandLede>
              Track drafting, dual approval, and conversions to purchase orders.
              Search and filter without leaving this board.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button asChild size="default" variant="on-dark">
              <Link href="/procurement/requisitions/new">
                <Plus className="mr-2 h-4 w-4" />
                New requisition
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            {workflowMetrics.map(({ status, config, count }) => {
              let footnote = "Awaiting finance";
              if (status === "approved") {
                footnote = "Ready for PO conversion";
              } else if (status === "rejected") {
                footnote = "Archived without PO";
              } else if (status === "pending_manager") {
                footnote = "Awaiting manager";
              }

              return (
                <MetricCell key={status}>
                  <div className="flex items-start justify-between gap-2">
                    <MetricLabel>{config.label}</MetricLabel>
                    <config.icon aria-hidden className="size-4 text-white/60" />
                  </div>
                  <MetricValue>{String(count)}</MetricValue>
                  <div className="text-xs text-white/55">{footnote}</div>
                </MetricCell>
              );
            })}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader
          count={`${filtered.length} in this tab`}
          description="Filter by workflow state, then open a row for approvals and line items."
          eyebrow="Operational list"
          title="Requisition queue"
        />

        <section className="rounded-[22px] border border-hairline bg-soft-stone p-6 sm:p-8">
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-4 w-4 text-muted-foreground" />
            <Input
              className="rounded-[16px] border-hairline bg-canvas pl-10"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by requisition # or department…"
              value={searchQuery}
            />
          </div>
          <Tabs className="mt-6" onValueChange={setActiveTab} value={activeTab}>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-[16px] border border-hairline bg-canvas p-1">
              <TabsTrigger
                className="rounded-full data-[state=active]:bg-ink data-[state=active]:text-white"
                value="all"
              >
                All ({requisitions.length})
              </TabsTrigger>
              {(
                [
                  "draft",
                  "pending_manager",
                  "pending_finance",
                  "approved",
                  "rejected",
                  "converted",
                  "cancelled",
                ] as const
              ).map((s) => {
                const count = requisitions.filter((r) => r.status === s).length;
                return count > 0 ? (
                  <TabsTrigger
                    className="rounded-full data-[state=active]:bg-ink data-[state=active]:text-white"
                    key={s}
                    value={s}
                  >
                    {REQ_STATUS_CONFIG[s].label} ({count})
                  </TabsTrigger>
                ) : null;
              })}
            </TabsList>
            <TabsContent className="mt-6" value={activeTab}>
              {filtered.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-hairline bg-canvas px-6 py-16 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-60" />
                  <p className="text-muted-foreground">
                    No requisitions match this view.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((req) => {
                    const config =
                      REQ_STATUS_CONFIG[req.status] || REQ_STATUS_CONFIG.draft;
                    const Icon = config.icon;
                    const priorityConfig =
                      PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.normal;
                    return (
                      <OperationalRow
                        className="p-5"
                        density="compact"
                        interactive
                        key={req.id}
                      >
                        <div className="flex flex-wrap items-center gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline ${config.color}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                className="font-medium text-base text-ink hover:underline"
                                href={`/procurement/requisitions/${req.id}`}
                              >
                                {req.requisitionNumber}
                              </Link>
                              <Badge className="font-normal" variant="outline">
                                {config.label}
                              </Badge>
                              <Badge
                                className="font-normal opacity-90"
                                variant="secondary"
                              >
                                {priorityConfig.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {req.department ? (
                                <span>{req.department}</span>
                              ) : null}
                              <span className="flex items-center gap-1 tabular-nums">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(Number(req.estimatedTotal))}
                              </span>
                              <span>
                                Requested {formatDateShort(req.requestDate)}
                              </span>
                              {req.requiredBy ? (
                                <span>
                                  Need by {formatDateShort(req.requiredBy)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/procurement/requisitions/${req.id}`}>
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </OperationalRow>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
