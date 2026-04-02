"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  FileText,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  DollarSign,
  Loader2,
  XCircle,
  Eye,
} from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/design-system/components/ui/tabs";
import { Input } from "@repo/design-system/components/ui/input";
import {
  STATUS_CONFIG,
  formatCurrency,
  formatDateShort,
} from "../components/po-shared";

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string | null;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  subtotal: number;
  total: number;
  item_count: number;
  pending_items: number;
  notes: string | null;
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
      const res = await fetch("/api/procurement/purchase-orders/list");
      const data = await res.json();
      if (data.success) setOrders(data.data.orders || []);
    } catch (error) {
      console.error("Failed to load POs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesTab = activeTab === "all" || o.status === activeTab;
      const matchesSearch =
        !searchQuery ||
        o.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchQuery]);



  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Track and manage purchase orders for your operation.</p>
        </div>
        <Link href="/procurement/purchase-orders/new">
          <Button><Plus className="h-4 w-4 mr-2" />New Purchase Order</Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["submitted", "approved", "ordered", "received"] as const).map((status) => {
          const config = STATUS_CONFIG[status];
          const count = orders.filter(o => o.status === status).length;
          return (
            <Card key={status}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                <config.icon className={`h-4 w-4 ${config.color.includes("blue") ? "text-blue-500" : config.color.includes("green") ? "text-green-500" : config.color.includes("purple") ? "text-purple-500" : "text-indigo-500"}`} />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by PO # or vendor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* Tabs & List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          {(["submitted", "approved", "ordered", "received", "cancelled"] as const).map(s => {
            const count = orders.filter(o => o.status === s).length;
            return count > 0 ? <TabsTrigger key={s} value={s}>{STATUS_CONFIG[s].label} ({count})</TabsTrigger> : null;
          })}
        </TabsList>
        <TabsContent value={activeTab}>
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No purchase orders found.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                const Icon = config.icon;
                return (
                  <Card key={order.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}><Icon className="h-5 w-5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/procurement/purchase-orders/${order.id}`} className="font-semibold hover:underline">{order.po_number}</Link>
                            <Badge className={config.color}>{config.label}</Badge>
                            {order.pending_items > 0 && order.status === "ordered" && (
                              <Badge variant="secondary">{order.pending_items} items pending</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {order.vendor_name && <span>{order.vendor_name}</span>}
                            <span>{order.item_count} items</span>
                            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(order.total)}</span>
                            <span>Ordered: {formatDateShort(order.order_date)}</span>
                            {order.expected_delivery_date && <span>ETA: {formatDateShort(order.expected_delivery_date)}</span>}
                          </div>
                        </div>
                        <Link href={`/procurement/purchase-orders/${order.id}`}>
                          <Button size="sm" variant="outline"><Eye className="h-4 w-4 mr-1" />View</Button>
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
