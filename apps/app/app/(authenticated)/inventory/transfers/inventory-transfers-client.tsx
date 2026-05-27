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
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  ArrowRightLeft,
  Check,
  Loader2Icon,
  Package,
  Plus,
  Truck,
  X,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface TransferItem {
  id: string;
  itemId: string;
  quantity: string;
  receivedQuantity?: string;
  notes?: string;
}

interface Transfer {
  id: string;
  transferNumber: string;
  fromLocationId: string;
  toLocationId: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  notes?: string;
  items: TransferItem[];
}

const statusColors: Record<string, string> = {
  pending: "bg-muted/50 text-foreground",
  approved: "bg-muted/50 text-foreground",
  in_transit: "bg-muted/50 text-foreground",
  completed: "bg-muted/50 text-foreground",
  cancelled: "bg-muted/50 text-foreground",
};

export function InventoryTransfersClient() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null
  );

  // Form state for new transfer
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [transferItems, setTransferItems] = useState<
    { itemId: string; quantity: string }[]
  >([{ itemId: "", quantity: "" }]);

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const response = await apiFetch(
        `/api/inventory/transfers/list?${params}`
      );
      const data = await response.json();
      setTransfers(data.transfers || []);
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    try {
      const response = await apiFetch(
        "/api/manifest/InventoryTransfer/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromLocationId: fromLocation,
            toLocationId: toLocation,
            notes,
            items: transferItems.filter((i) => i.itemId && i.quantity),
          }),
        }
      );

      if (response.ok) {
        toast.success("Transfer created successfully");
        setIsCreateOpen(false);
        resetForm();
        fetchTransfers();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create transfer");
      }
    } catch (error) {
      console.error("Failed to create transfer:", error);
      toast.error("Failed to create transfer");
    }
  };

  const handleAction = async (action: string, transferId: string) => {
    try {
      const response = await apiFetch(
        `/api/manifest/InventoryTransfer/commands/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transferId }),
        }
      );

      if (response.ok) {
        toast.success(`Transfer ${action}d successfully`);
        fetchTransfers();
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to ${action} transfer`);
      }
    } catch (error) {
      console.error(`Failed to ${action} transfer:`, error);
      toast.error(`Failed to ${action} transfer`);
    }
  };

  const resetForm = () => {
    setFromLocation("");
    setToLocation("");
    setNotes("");
    setTransferItems([{ itemId: "", quantity: "" }]);
  };

  const addItemRow = () => {
    setTransferItems([...transferItems, { itemId: "", quantity: "" }]);
  };

  const updateItemRow = (index: number, field: string, value: string) => {
    const updated = [...transferItems];
    updated[index] = { ...updated[index], [field]: value };
    setTransferItems(updated);
  };

  const removeItemRow = (index: number) => {
    if (transferItems.length > 1) {
      setTransferItems(transferItems.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inventory Transfers
          </h1>
          <p className="text-muted-foreground">
            Track stock movements between storage locations
          </p>
        </div>
        <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Inventory Transfer</DialogTitle>
              <DialogDescription>
                Request a transfer of inventory between locations
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from">From Location</Label>
                  <Input
                    id="from"
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="Source location ID"
                    value={fromLocation}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To Location</Label>
                  <Input
                    id="to"
                    onChange={(e) => setToLocation(e.target.value)}
                    placeholder="Destination location ID"
                    value={toLocation}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Items</Label>
                {transferItems.map((item, index) => (
                  <div className="flex gap-2" key={index}>
                    <Input
                      className="flex-1"
                      onChange={(e) =>
                        updateItemRow(index, "itemId", e.target.value)
                      }
                      placeholder="Item ID"
                      value={item.itemId}
                    />
                    <Input
                      className="w-32"
                      onChange={(e) =>
                        updateItemRow(index, "quantity", e.target.value)
                      }
                      placeholder="Quantity"
                      value={item.quantity}
                    />
                    <Button
                      onClick={() => removeItemRow(index)}
                      size="icon"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={addItemRow} variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  value={notes}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsCreateOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleCreateTransfer}>Create Transfer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Transfers</CardTitle>
            <Select onValueChange={setStatusFilter} value={statusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : transfers.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ArrowRightLeft />
                </EmptyMedia>
                <EmptyTitle>
                  {statusFilter !== "all"
                    ? "No matching transfers"
                    : "No transfers yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {statusFilter !== "all"
                    ? "No transfers match the selected status filter. Try a different filter."
                    : "Create your first inventory transfer to move stock between locations."}
                </EmptyDescription>
              </EmptyHeader>
              {statusFilter === "all" && (
                <EmptyContent>
                  <Button onClick={() => setIsCreateOpen(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Transfer
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">
                      {transfer.transferNumber}
                    </TableCell>
                    <TableCell className="truncate max-w-32">
                      {transfer.fromLocationId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="truncate max-w-32">
                      {transfer.toLocationId.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[transfer.status]}>
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{transfer.items?.length || 0}</TableCell>
                    <TableCell>
                      {new Date(transfer.requestedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {transfer.status === "pending" && (
                          <>
                            <Button
                              onClick={() =>
                                handleAction("approve", transfer.id)
                              }
                              size="sm"
                              title="Approve"
                              variant="outline"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() =>
                                handleAction("cancel", transfer.id)
                              }
                              size="sm"
                              title="Cancel"
                              variant="outline"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {transfer.status === "approved" && (
                          <Button
                            onClick={() => handleAction("ship", transfer.id)}
                            size="sm"
                            title="Ship"
                            variant="outline"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        {transfer.status === "in_transit" && (
                          <Button
                            onClick={() => handleAction("receive", transfer.id)}
                            size="sm"
                            title="Receive"
                            variant="outline"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
