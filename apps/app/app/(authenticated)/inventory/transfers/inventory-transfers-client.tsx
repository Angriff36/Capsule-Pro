"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Package, ArrowRight, Plus, Check, X, Truck, RotateCcw } from "lucide-react";

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
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function InventoryTransfersClient() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Form state for new transfer
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [transferItems, setTransferItems] = useState<{ itemId: string; quantity: string }[]>([
    { itemId: "", quantity: "" },
  ]);

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
      const response = await fetch(`/api/inventory/transfers/list?${params}`);
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
      const response = await fetch("/api/inventory/transfers/commands/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLocationId: fromLocation,
          toLocationId: toLocation,
          notes,
          items: transferItems.filter((i) => i.itemId && i.quantity),
        }),
      });

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
      const response = await fetch(`/api/inventory/transfers/commands/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId }),
      });

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
          <h1 className="text-3xl font-bold">Inventory Transfers</h1>
          <p className="text-muted-foreground">
            Track stock movements between storage locations
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    placeholder="Source location ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To Location</Label>
                  <Input
                    id="to"
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value)}
                    placeholder="Destination location ID"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Items</Label>
                {transferItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Item ID"
                      value={item.itemId}
                      onChange={(e) => updateItemRow(index, "itemId", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => updateItemRow(index, "quantity", e.target.value)}
                      className="w-32"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeItemRow(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addItemRow}>
                  <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transfers found
            </div>
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
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction("approve", transfer.id)}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction("cancel", transfer.id)}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {transfer.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction("ship", transfer.id)}
                            title="Ship"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        {transfer.status === "in_transit" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction("receive", transfer.id)}
                            title="Receive"
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
