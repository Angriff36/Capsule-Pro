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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  inventoryTransferApprove,
  inventoryTransferCancel,
  inventoryTransferCreate,
  inventoryTransferReceive,
  inventoryTransferShip,
  listInventoryTransfers,
} from "@/app/lib/manifest-client.generated";

interface TransferItem {
  id: string;
  itemId: string;
  notes?: string;
  quantity: string;
  receivedQuantity?: string;
}

interface Transfer {
  approvedAt?: string;
  fromLocationId: string;
  id: string;
  items: TransferItem[];
  notes?: string;
  receivedAt?: string;
  requestedAt: string;
  shippedAt?: string;
  status: string;
  toLocationId: string;
  transferNumber: string;
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
  const [_selectedTransfer, _setSelectedTransfer] = useState<Transfer | null>(
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
      const query: Record<string, string | number> = {};
      if (statusFilter !== "all") {
        query.status = statusFilter;
      }
      const result = await listInventoryTransfers(
        Object.keys(query).length > 0 ? query : undefined
      );
      setTransfers(result.data as unknown as Transfer[]);
    } catch (error) {
      console.error("Failed to fetch transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    try {
      await inventoryTransferCreate({
        fromLocationId: fromLocation,
        toLocationId: toLocation,
        notes,
        items: JSON.stringify(
          transferItems.filter((i) => i.itemId && i.quantity)
        ),
      });

      toast.success("Transfer created successfully");
      setIsCreateOpen(false);
      resetForm();
      fetchTransfers();
    } catch (error) {
      console.error("Failed to create transfer:", error);
      toast.error("Failed to create transfer");
    }
  };

  const handleAction = async (action: string, transferId: string) => {
    try {
      const fn = {
        approve: inventoryTransferApprove,
        cancel: inventoryTransferCancel,
        ship: inventoryTransferShip,
        receive: inventoryTransferReceive,
      }[action];

      if (!fn) {
        toast.error(`Unknown action: ${action}`);
        return;
      }

      await fn({ id: transferId });
      toast.success(`Transfer ${action}d successfully`);
      fetchTransfers();
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
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">
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
          <div className="flex items-center justify-between">
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
                  {statusFilter === "all"
                    ? "No transfers yet"
                    : "No matching transfers"}
                </EmptyTitle>
                <EmptyDescription>
                  {statusFilter === "all"
                    ? "Create your first inventory transfer to move stock between locations."
                    : "No transfers match the selected status filter. Try a different filter."}
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
                    <TableCell className="max-w-32 truncate">
                      {transfer.fromLocationId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
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
