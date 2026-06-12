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
import { listPurchaseOrders } from "@/app/lib/manifest-client.generated";
import {
  formatCurrency,
  formatDateShort,
  STATUS_CONFIG,
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
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const result = await listPurchaseOrders();
      setOrders(result.data as unknown as PurchaseOrder[]);
    } catch (error) {
      console.error("Failed to load POs:", error);
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
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground">
            Track and manage purchase orders for your operation.
          </p>
        </div>
        <Link href="/procurement/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["submitted", "approved", "ordered", "received"] as const).map(
          (status) => {
            const config = STATUS_CONFIG[status];
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
                {STATUS_CONFIG[s].label} ({count})
              </TabsTrigger>
            ) : null;
          })}
        </TabsList>
        <TabsContent value={activeTab}>
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>No purchase orders found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const config =
                  STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
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
    </div>
  );
}
