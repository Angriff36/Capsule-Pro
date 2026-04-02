"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { POLineItemsDisplay, type POItem } from "../../components/po-line-items";
import {
  STATUS_CONFIG,
  STATUS_WORKFLOW,
  formatCurrency,
  formatDate,
} from "../../components/po-shared";

interface POOrder {
  id: string;
  po_number: string;
  vendor_name: string | null;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  notes: string | null;
  submitted_at: string | null;
  received_at: string | null;
}

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id ?? "") as string;

  const [order, setOrder] = useState<POOrder | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data.order);
        setItems(data.data.items || []);
        const initial: Record<string, string> = {};
        (data.data.items || []).forEach((item: POItem) => {
          initial[item.id] = String(
            Math.max(0, Number(item.quantity_ordered) - Number(item.quantity_received)),
          );
        });
        setReceiveItems(initial);
      }
    } catch (error) {
      console.error("Failed to load PO:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setUpdating(newStatus);
    try {
      const res = await fetch(
        "/api/procurement/purchase-orders/commands/update-status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, status: newStatus }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setOrder((prev) =>
          prev ? { ...prev, status: newStatus } : prev,
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleReceive = async () => {
    if (!order) return;
    setReceiving(true);
    try {
      const receivePayload = Object.entries(receiveItems).map(
        ([itemId, qty]) => ({
          itemId,
          quantityReceived: Number(qty),
          quantityOrdered:
            Number(items.find((i) => i.id === itemId)?.quantity_ordered) || 0,
        }),
      );

      const res = await fetch(
        "/api/procurement/purchase-orders/commands/receive",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            items: receivePayload,
          }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setShowReceiveDialog(false);
        await loadOrder();
      }
    } catch (error) {
      console.error("Failed to receive items:", error);
    } finally {
      setReceiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Purchase order not found.</p>
        <Link href="/procurement/purchase-orders">
          <Button variant="outline" className="mt-4">
            Back to Purchase Orders
          </Button>
        </Link>
      </div>
    );
  }

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  const workflowActions = STATUS_WORKFLOW[order.status] || [];
  const totalReceived = items.reduce(
    (sum, i) => sum + Number(i.quantity_received),
    0,
  );
  const totalOrdered = items.reduce(
    (sum, i) => sum + Number(i.quantity_ordered),
    0,
  );
  const receiveProgress =
    totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/procurement/purchase-orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{order.po_number}</h1>
            <Badge className={config.color}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {order.vendor_name || "No vendor"} · {formatDate(order.order_date)}
          </p>
        </div>
        <div className="flex gap-2">
          {workflowActions.map((action: string) => {
            const actionConfig = STATUS_CONFIG[action];
            return (
              <Button
                key={action}
                variant={
                  action === "cancelled" || action === "rejected"
                    ? "destructive"
                    : "default"
                }
                size="sm"
                disabled={updating === action}
                onClick={() => handleStatusUpdate(action)}
              >
                {updating === action && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {actionConfig?.label}
              </Button>
            );
          })}
          {(order.status === "ordered" || order.status === "approved") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReceiveDialog(true)}
            >
              <Package className="h-4 w-4 mr-2" />
              Receive Items
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subtotal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(order.subtotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(order.tax_amount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(order.total)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receive Progress
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receiveProgress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full ${receiveProgress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${receiveProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No items on this order.
            </div>
          ) : (
            <POLineItemsDisplay items={items} />
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Receive Dialog */}
      <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receive Items</DialogTitle>
            <DialogDescription>
              Record quantities received for each line item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {items.map((item) => {
              const remaining = Math.max(
                0,
                Number(item.quantity_ordered) - Number(item.quantity_received),
              );
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-3 gap-4 items-center"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {item.item_name || item.item_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ordered: {Number(item.quantity_ordered)} · Received:{" "}
                      {Number(item.quantity_received)}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    Remaining: {remaining} {item.unit_of_measure || ""}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={remaining}
                    step="0.01"
                    value={receiveItems[item.id] || ""}
                    onChange={(e) =>
                      setReceiveItems((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReceiveDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleReceive} disabled={receiving}>
              {receiving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
