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
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listInventoryItems,
  listStorageLocations,
  listVendors,
} from "@/app/lib/manifest-client.generated";
import { OperationalPageShell } from "../../../../components/operational-page-shell";
import { createPurchaseOrder } from "../../actions";
import type { Location, POFormData, Vendor } from "../../components/po-form";
import { POForm } from "../../components/po-form";
import {
  type EditableLineItem,
  POLineItemsEditable,
} from "../../components/po-line-items";
import { formatCurrency } from "../../components/po-shared";

interface InventoryItem {
  category: string;
  id: string;
  item_number: string;
  name: string;
  unit_cost: number;
  unit_of_measure: string;
}

export default function NewPOPage() {
  const posthog = usePostHog();

  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const [form, setForm] = useState<POFormData>({
    vendorId: "",
    locationId: "",
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
      const [vendorsResult, itemsResult, locationsResult] = await Promise.all([
        listVendors(),
        listInventoryItems({ limit: 200 }),
        listStorageLocations({ isActive: "true" }),
      ]);
      const items = itemsResult.data as unknown as InventoryItem[];
      setVendors(vendorsResult.data as unknown as Vendor[]);
      setInventoryItems(items);
      setLocations(locationsResult.data as unknown as Location[]);

      // Prefill from reorder handoffs (?item=<id|item_number>&qty=<n>) —
      // low-stock alerts and reorder suggestions link here with a payload
      // that was previously ignored.
      const itemParam = searchParams?.get("item");
      if (itemParam) {
        const match = items.find(
          (item) => item.id === itemParam || item.item_number === itemParam
        );
        if (match) {
          const qty = Number(searchParams?.get("qty"));
          setLineItems((prev) =>
            prev.some((li) => li.itemId === match.id)
              ? prev
              : [
                  ...prev,
                  {
                    itemId: match.id,
                    itemName: match.name,
                    itemNumber: match.item_number,
                    unitOfMeasure: match.unit_of_measure,
                    quantityOrdered: Number.isFinite(qty) && qty > 0 ? qty : 1,
                    unitCost: Number(match.unit_cost),
                  },
                ]
          );
        } else {
          toast.error(`Item "${itemParam}" not found in inventory`);
        }
      }
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
    if (lineItems.some((li) => li.itemId === item.id)) {
      return;
    }
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
    if (!form.vendorId || lineItems.length === 0) {
      return;
    }

    setCreating(true);
    try {
      posthog?.capture("procurement:order_created", {
        vendor_id: form.vendorId,
        line_item_count: lineItems.length,
      });

      // Use the server action for creation
      await createPurchaseOrder({
        vendorId: form.vendorId,
        locationId: form.locationId || null,
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
    <>
      <OperationalPageShell
        actions={
          <Link href="/procurement/purchase-orders">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        }
        description="Create a new purchase order for your vendor."
        eyebrow="Procurement / Purchase orders"
        title="New purchase order"
      >
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
                    locations={locations}
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
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {lineItems.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <Package className="mx-auto mb-4 h-12 w-12 opacity-50" />
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
                  disabled={
                    !form.vendorId || lineItems.length === 0 || creating
                  }
                  type="submit"
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create PO
                </Button>
              </div>
            </div>
          </div>
        </form>
      </OperationalPageShell>

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
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-10"
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search by name or item number..."
                value={itemSearch}
              />
            </div>
            <div className="max-h-[400px] space-y-1 overflow-auto">
              {filteredItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No items found.
                </p>
              ) : (
                filteredItems.slice(0, 20).map((item) => {
                  const alreadyAdded = lineItems.some(
                    (li) => li.itemId === item.id
                  );
                  return (
                    <button
                      className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={alreadyAdded}
                      key={item.id}
                      onClick={() => addLineItem(item)}
                      type="button"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {item.item_number} · {item.category} ·{" "}
                          {item.unit_of_measure}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {formatCurrency(Number(item.unit_cost))}
                        </p>
                        {alreadyAdded && (
                          <p className="text-muted-foreground text-xs">Added</p>
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
    </>
  );
}
