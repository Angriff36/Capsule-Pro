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
import { OperationalPageShell } from "../../components/operational-page-shell";
import { apiFetch } from "@/app/lib/api";
import {
  formatCurrency,
  formatDateShort,
  getStatusConfig,
} from "../components/po-shared";

interface PurchaseOrder {
  actual_delivery_date: string | null;
  expected_delivery_date: string | null;
  id: string;
  item_count: number;
  notes: string | null;
  order_date: string;
  pending_items: number;
  po_number: string;
  status: string;
  subtotal: number;
  total: number;
  vendor_name: string | null;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // The procurement route returns rows already shaped to the snake_case
      // fields this page renders (po_number, vendor_name, item_count, ...).
      const res = await apiFetch("/api/procurement/purchase-orders/list");
      if (!res.ok) {
        throw new Error(`Failed to load purchase orders (${res.status})`);
      }
      const json = (await res.json()) as { orders?: PurchaseOrder[] };
      setOrders(json.orders ?? []);
    } catch {
      setLoadError("Could not load purchase orders. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const matchesTab = activeTab === "all" || o.status === activeTab;
        const matchesSearch =
          !searchQuery ||
          o.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
      }),
    [orders, activeTab, searchQuery]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <OperationalPageShell
      actions={
        <Link href="/procurement/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </Link>
      }
      description="Track and manage purchase orders for your operation."
      eyebrow="Procurement / Purchase orders"
      title="Purchase orders"
    >

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["submitted", "approved", "ordered", "received"] as const).map(
          (status) => {
            const config = getStatusConfig(status);
            const count = orders.filter((o) => o.status === status).length;
            return (
              <Card key={status}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-medium text-sm">
                    {config.label}
                  </CardTitle>
                  <config.icon
                    className={`h-4 w-4 ${config.color.includes("blue") ? "text-blue-500" : config.color.includes("green") ? "text-green-500" : config.color.includes("purple") ? "text-purple-500" : "text-indigo-500"}`}
                  />
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">{count}</div>
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by PO # or vendor..."
          value={searchQuery}
        />
      </div>

      {/* Tabs & List */}
      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="rounded-[16px] border border-hairline bg-canvas p-1">
          <TabsTrigger
            className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
            value="all"
          >
            All ({orders.length})
          </TabsTrigger>
          {(
            [
              "submitted",
              "approved",
              "ordered",
              "received",
              "cancelled",
            ] as const
          ).map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            return count > 0 ? (
              <TabsTrigger
                className="rounded-[12px] px-4 py-1.5 font-medium text-sm transition-colors data-[state=active]:bg-ink data-[state=active]:text-white"
                key={s}
                value={s}
              >
                {getStatusConfig(s).label} ({count})
              </TabsTrigger>
            ) : null;
          })}
        </TabsList>
        <TabsContent value={activeTab}>
          {loadError ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="mb-4">{loadError}</p>
                <Button onClick={loadOrders} variant="outline">
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No purchase orders found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const config = getStatusConfig(order.status);
                const Icon = config.icon;
                return (
                  <Card
                    className="transition-shadow hover:border-primary/40"
                    key={order.id}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Link
                              className="font-semibold hover:underline"
                              href={`/procurement/purchase-orders/${order.id}`}
                            >
                              {order.po_number}
                            </Link>
                            <Badge className={config.color}>
                              {config.label}
                            </Badge>
                            {order.pending_items > 0 &&
                              order.status === "ordered" && (
                                <Badge variant="secondary">
                                  {order.pending_items} items pending
                                </Badge>
                              )}
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground text-sm">
                            {order.vendor_name && (
                              <span>{order.vendor_name}</span>
                            )}
                            <span>{order.item_count} items</span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(order.total)}
                            </span>
                            <span>
                              Ordered: {formatDateShort(order.order_date)}
                            </span>
                            {order.expected_delivery_date && (
                              <span>
                                ETA:{" "}
                                {formatDateShort(order.expected_delivery_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`/procurement/purchase-orders/${order.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="mr-1 h-4 w-4" />
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
    </OperationalPageShell>
  );
}
