"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Purchase Requisitions
          </h1>
          <p className="text-muted-foreground">
            Create and manage purchase requests for your operation.
          </p>
        </div>
        <Link href="/procurement/requisitions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Requisition
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {(
          [
            "pending_manager",
            "pending_finance",
            "approved",
            "rejected",
          ] as const
        ).map((status) => {
          const config = REQ_STATUS_CONFIG[status];
          const count = requisitions.filter((r) => r.status === status).length;
          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {config.label}
                </CardTitle>
                <config.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by requisition # or department..."
          value={searchQuery}
        />
      </div>

      {/* Tabs & List */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="all">All ({requisitions.length})</TabsTrigger>
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
              <TabsTrigger key={s} value={s}>
                {REQ_STATUS_CONFIG[s].label} ({count})
              </TabsTrigger>
            ) : null;
          })}
        </TabsList>
        <TabsContent value={activeTab}>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No requisitions found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((req) => {
                const config =
                  REQ_STATUS_CONFIG[req.status] || REQ_STATUS_CONFIG.draft;
                const Icon = config.icon;
                const priorityConfig =
                  PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.normal;
                return (
                  <Card
                    className="hover:shadow-sm transition-shadow"
                    key={req.id}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              className="font-semibold hover:underline"
                              href={`/procurement/requisitions/${req.id}`}
                            >
                              {req.requisitionNumber}
                            </Link>
                            <Badge className={config.color}>
                              {config.label}
                            </Badge>
                            <Badge
                              className={priorityConfig.color}
                              variant="outline"
                            >
                              {priorityConfig.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {req.department && <span>{req.department}</span>}
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(Number(req.estimatedTotal))}
                            </span>
                            <span>
                              Requested: {formatDateShort(req.requestDate)}
                            </span>
                            {req.requiredBy && (
                              <span>
                                Needed by: {formatDateShort(req.requiredBy)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`/procurement/requisitions/${req.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
