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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { ArrowLeft, DollarSign, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OperationalPageShell } from "../../../../components/operational-page-shell";
import {
  getPurchaseOrder,
  listPurchaseOrderItems,
  purchaseOrderApprove,
  purchaseOrderCancel,
  purchaseOrderMarkOrdered,
  purchaseOrderMarkReceived,
  purchaseOrderReject,
  purchaseOrderSubmit,
} from "@/app/lib/manifest-client.generated";
import {
  type POItem,
  POLineItemsDisplay,
} from "../../components/po-line-items";
import {
  formatCurrency,
  formatDate,
  getStatusConfig,
  STATUS_WORKFLOW,
} from "../../components/po-shared";

interface POOrder {
  actual_delivery_date: string | null;
  expected_delivery_date: string | null;
  id: string;
  notes: string | null;
  order_date: string;
  po_number: string;
  received_at: string | null;
  shipping_amount: number;
  status: string;
  submitted_at: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  vendor_name: string | null;
}

export default function PODetailPage() {
  const params = useParams();
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
      const [orderResult, itemsResult] = await Promise.all([
        getPurchaseOrder(id),
        listPurchaseOrderItems(),
      ]);
      const orderData = orderResult as unknown as POOrder;
      const allItems = itemsResult.data as unknown as POItem[];
      const poItems = allItems.filter(
        (item) =>
          (item as unknown as Record<string, unknown>).purchaseOrderId === id
      );
      setOrder(orderData);
      setItems(poItems);
      const initial: Record<string, string> = {};
      poItems.forEach((item: POItem) => {
        initial[item.id] = String(
          Math.max(
            0,
            Number(item.quantity_ordered) - Number(item.quantity_received)
          )
        );
      });
      setReceiveItems(initial);
    } catch (error) {
      console.error("Failed to load PO:", error);
    } finally {
      setLoading(false);
    }
  };

  const STATUS_COMMANDS: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown>
  > = {
    submitted: purchaseOrderSubmit,
    approved: purchaseOrderApprove,
    ordered: purchaseOrderMarkOrdered,
    cancelled: purchaseOrderCancel,
    rejected: purchaseOrderReject,
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) {
      return;
    }
    setUpdating(newStatus);
    try {
      const command = STATUS_COMMANDS[newStatus];
      if (command) {
        await command({ orderId: order.id });
        setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleReceive = async () => {
    if (!order) {
      return;
    }
    setReceiving(true);
    try {
      for (const [_itemId, qty] of Object.entries(receiveItems)) {
        const qtyReceived = Number(qty);
        if (qtyReceived > 0) {
          await purchaseOrderMarkReceived({
            id: order.id,
          });
        }
      }
      setShowReceiveDialog(false);
      await loadOrder();
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
          <Button className="mt-4" variant="outline">
            Back to Purchase Orders
          </Button>
        </Link>
      </div>
    );
  }

  const config = getStatusConfig(order.status);
  const Icon = config.icon;
  const workflowActions = STATUS_WORKFLOW[order.status] || [];
  const totalReceived = items.reduce(
    (sum, i) => sum + Number(i.quantity_received),
    0
  );
  const totalOrdered = items.reduce(
    (sum, i) => sum + Number(i.quantity_ordered),
    0
  );
  const receiveProgress =
    totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  return (
    <>
    <OperationalPageShell
      actions={
        <>
          <Link href="/procurement/purchase-orders">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          {workflowActions.map((action: string) => {
            const actionConfig = getStatusConfig(action);
            return (
              <Button
                disabled={updating === action}
                key={action}
                onClick={() => handleStatusUpdate(action)}
                size="sm"
                variant={
                  action === "cancelled" || action === "rejected"
                    ? "destructive"
                    : "default"
                }
              >
                {updating === action && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {actionConfig?.label}
              </Button>
            );
          })}
          {(order.status === "ordered" || order.status === "approved") && (
            <Button
              onClick={() => setShowReceiveDialog(true)}
              size="sm"
              variant="outline"
            >
              <Package className="mr-2 h-4 w-4" />
              Receive Items
            </Button>
          )}
        </>
      }
      description={`${order.vendor_name || "No vendor"} · ${formatDate(order.order_date)}`}
      eyebrow="Procurement / Purchase orders"
      title={
        <span className="inline-flex items-center gap-3">
          {order.po_number}
          <Badge className={config.color}>
            <Icon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </span>
      }
    >

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Subtotal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(order.subtotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(order.tax_amount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {formatCurrency(order.total)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Receive Progress
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{receiveProgress}%</div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted/50">
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
            <p className="text-muted-foreground text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      </OperationalPageShell>

      {/* Receive Dialog */}
      <Dialog onOpenChange={setShowReceiveDialog} open={showReceiveDialog}>
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
                Number(item.quantity_ordered) - Number(item.quantity_received)
              );
              return (
                <div
                  className="grid grid-cols-3 items-center gap-4"
                  key={item.id}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {item.item_name || item.item_id}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Ordered: {Number(item.quantity_ordered)} · Received:{" "}
                      {Number(item.quantity_received)}
                    </p>
                  </div>
                  <div className="text-right text-muted-foreground text-sm">
                    Remaining: {remaining} {item.unit_of_measure || ""}
                  </div>
                  <Input
                    max={remaining}
                    min="0"
                    onChange={(e) =>
                      setReceiveItems((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={receiveItems[item.id] || ""}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowReceiveDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={receiving} onClick={handleReceive}>
              {receiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
