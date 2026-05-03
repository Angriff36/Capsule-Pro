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
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeft, Loader2, Package, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { createPurchaseRequisition } from "../../actions";
import { formatCurrency } from "../../components/req-shared";

interface InventoryItem {
  id: string;
  item_number: string;
  name: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
}

interface LineItem {
  itemId: string;
  itemName: string;
  itemNumber: string;
  unitOfMeasure: string;
  quantityRequested: number;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
}

export default function NewRequisitionPage() {
  const router = useRouter();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const [justification, setJustification] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [department, setDepartment] = useState("");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const itemsRes = await apiFetch("/api/inventory/items?limit=200");
      const itemsData = await itemsRes.json();
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
        quantityRequested: 1,
        estimatedUnitCost: Number(item.unit_cost),
        estimatedTotalCost: Number(item.unit_cost),
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
    field: "quantityRequested" | "estimatedUnitCost",
    value: string
  ) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.itemId !== itemId) return li;
        const num = Number.parseFloat(value) || 0;
        const updated = { ...li, [field]: num };
        updated.estimatedTotalCost =
          updated.quantityRequested * updated.estimatedUnitCost;
        return updated;
      })
    );
  };

  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.estimatedTotalCost,
    0
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) return;

    setCreating(true);
    try {
      await createPurchaseRequisition({
        requiredBy: requiredBy || undefined,
        department: department || undefined,
        justification: justification || undefined,
        priority,
        notes: notes || undefined,
        items: lineItems.map((li) => ({
          itemId: li.itemId,
          itemName: li.itemName,
          itemNumber: li.itemNumber,
          unitOfMeasure: li.unitOfMeasure,
          quantityRequested: li.quantityRequested,
          estimatedUnitCost: li.estimatedUnitCost,
          estimatedTotalCost: li.estimatedTotalCost,
        })),
      });
    } catch (error) {
      console.error("Failed to create requisition:", error);
      toast.error("Failed to create requisition", {
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
        <Link href="/procurement/requisitions">
          <Button size="icon" variant="ghost">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">New Purchase Requisition</h1>
          <p className="text-muted-foreground">
            Create a new purchase request for approval.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
                <CardDescription>
                  Priority, department, and delivery information.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select onValueChange={setPriority} value={priority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requiredBy">Required By</Label>
                    <Input
                      id="requiredBy"
                      onChange={(e) => setRequiredBy(e.target.value)}
                      type="date"
                      value={requiredBy}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Kitchen, Bar, Warehouse"
                    value={department}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="justification">Justification</Label>
                  <Textarea
                    id="justification"
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Why is this purchase needed?"
                    value={justification}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    value={notes}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Line Items ({lineItems.length})</CardTitle>
                  <CardDescription>
                    Add items to this requisition.
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
                  <div className="divide-y">
                    {lineItems.map((item) => (
                      <div
                        className="flex items-center gap-4 p-4"
                        key={item.itemId}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.itemNumber} &middot; {item.unitOfMeasure}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-20"
                            min="1"
                            onChange={(e) =>
                              updateLineItem(
                                item.itemId,
                                "quantityRequested",
                                e.target.value
                              )
                            }
                            step="0.01"
                            type="number"
                            value={item.quantityRequested}
                          />
                          <span className="text-sm text-muted-foreground">
                            &times;
                          </span>
                          <Input
                            className="w-24"
                            min="0"
                            onChange={(e) =>
                              updateLineItem(
                                item.itemId,
                                "estimatedUnitCost",
                                e.target.value
                              )
                            }
                            step="0.01"
                            type="number"
                            value={item.estimatedUnitCost}
                          />
                          <span className="text-sm font-medium w-24 text-right">
                            {formatCurrency(item.estimatedTotalCost)}
                          </span>
                          <Button
                            onClick={() => removeLineItem(item.itemId)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            &times;
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span>{lineItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Link className="flex-1" href="/procurement/requisitions">
                <Button className="w-full" type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button
                className="flex-1"
                disabled={lineItems.length === 0 || creating}
                type="submit"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Requisition
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
                          {item.item_number} &middot; {item.category} &middot;{" "}
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
