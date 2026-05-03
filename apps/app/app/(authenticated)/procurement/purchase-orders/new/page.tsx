"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { ArrowLeft, Loader2, Package, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { createPurchaseOrder } from "../../actions";
import type { POFormData, Vendor } from "../../components/po-form";
import { POForm } from "../../components/po-form";
import {
  type EditableLineItem,
  POLineItemsEditable,
} from "../../components/po-line-items";
import { formatCurrency } from "../../components/po-shared";

interface InventoryItem {
  id: string;
  item_number: string;
  name: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
}

export default function NewPOPage() {
  const posthog = usePostHog();
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const [form, setForm] = useState<POFormData>({
    vendorId: "",
    expectedDeliveryDate: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<EditableLineItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vendorsRes, itemsRes] = await Promise.all([
        apiFetch("/api/procurement/vendors/list"),
        apiFetch("/api/inventory/items?limit=200"),
      ]);
      const vendorsData = await vendorsRes.json();
      const itemsData = await itemsRes.json();
      if (vendorsData.success) setVendors(vendorsData.data.vendors || []);
      if (itemsData.success) setInventoryItems(itemsData.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.item_number.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const addLineItem = (item: InventoryItem) => {
    if (lineItems.some((li) => li.itemId === item.id)) return;
    setLineItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        itemName: item.name,
        itemNumber: item.item_number,
        unitOfMeasure: item.unit_of_measure,
        quantityOrdered: 1,
        unitCost: Number(item.unit_cost),
      },
    ]);
    setShowItemDialog(false);
    setItemSearch("");
  };

  const removeLineItem = (itemId: string) => {
    setLineItems((prev) => prev.filter((li) => li.itemId !== itemId));
  };

  const updateLineItem = (
    itemId: string,
    field: "quantityOrdered" | "unitCost",
    value: string
  ) => {
    setLineItems((prev) =>
      prev.map((li) =>
        li.itemId === itemId
          ? { ...li, [field]: Number.parseFloat(value) || 0 }
          : li
      )
    );
  };

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.quantityOrdered * li.unitCost,
    0
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendorId || lineItems.length === 0) return;

    setCreating(true);
    try {
      posthog?.capture("procurement:order_created", {
        vendor_id: form.vendorId,
        line_item_count: lineItems.length,
      });

      // Use the server action for creation
      await createPurchaseOrder({
        vendorId: form.vendorId,
        expectedDeliveryDate: form.expectedDeliveryDate || null,
        notes: form.notes || null,
        items: lineItems.map((li) => ({
          itemId: li.itemId,
          quantityOrdered: li.quantityOrdered,
          unitCost: li.unitCost,
          unitId: 1,
        })),
      });
    } catch (error) {
      console.error("Failed to create PO:", error);
      toast.error("Failed to create purchase order", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/procurement/purchase-orders">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">New Purchase Order</h1>
          <p className="text-muted-foreground">
            Create a new purchase order for your vendor.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                  Vendor and delivery information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <POForm
                  form={form}
                  onChange={(
                    update: Partial<
                      import("../../components/po-form").POFormData
                    >
                  ) =>
                    setForm(
                      (
                        prev: import("../../components/po-form").POFormData
                      ) => ({ ...prev, ...update })
                    )
                  }
                  vendors={vendors}
                />
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Line Items ({lineItems.length})</CardTitle>
                  <CardDescription>
                    Add items to this purchase order.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowItemDialog(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {lineItems.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items added yet.</p>
                    <p className="text-sm">
                      Click &quot;Add Item&quot; to search and add inventory
                      items.
                    </p>
                  </div>
                ) : (
                  <POLineItemsEditable
                    items={lineItems}
                    onRemove={removeLineItem}
                    onUpdate={updateLineItem}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span>{lineItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatCurrency(0)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Link className="flex-1" href="/procurement/purchase-orders">
                <Button className="w-full" type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                className="flex-1"
                disabled={!form.vendorId || lineItems.length === 0 || creating}
                type="submit"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create PO
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Add Item Dialog */}
      <Dialog onOpenChange={setShowItemDialog} open={showItemDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Search and select an inventory item to add.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-10"
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search by name or item number..."
                value={itemSearch}
              />
            </div>
            <div className="max-h-[400px] overflow-auto space-y-1">
              {filteredItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No items found.
                </p>
              ) : (
                filteredItems.slice(0, 20).map((item) => {
                  const alreadyAdded = lineItems.some(
                    (li) => li.itemId === item.id
                  );
                  return (
                    <button
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      disabled={alreadyAdded}
                      key={item.id}
                      onClick={() => addLineItem(item)}
                      type="button"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.item_number} · {item.category} ·{" "}
                          {item.unit_of_measure}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(Number(item.unit_cost))}
                        </p>
                        {alreadyAdded && (
                          <p className="text-xs text-muted-foreground">Added</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
