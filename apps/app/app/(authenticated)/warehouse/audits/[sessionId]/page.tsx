"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Progress } from "@repo/design-system/components/ui/progress";
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
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  ClipboardCheckIcon,
  EditIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { formatCurrency } from "@/app/lib/format";

type CycleCountSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "finalized"
  | "cancelled";

type CycleCountSessionType =
  | "ad_hoc"
  | "scheduled_daily"
  | "scheduled_weekly"
  | "scheduled_monthly";

interface CycleCountSession {
  id: string;
  session_id: string;
  session_name: string;
  count_type: CycleCountSessionType;
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  finalized_at: string | null;
  status: CycleCountSessionStatus;
  total_items: number;
  counted_items: number;
  total_variance: number;
  variance_percentage: number;
  notes: string | null;
  created_at: string;
}

interface CycleCountRecord {
  id: string;
  session_id: string;
  item_id: string;
  item_number: string;
  item_name: string;
  storage_location_id: string;
  expected_quantity: number;
  counted_quantity: number;
  variance: number;
  variance_pct: number;
  count_date: string;
  barcode: string | null;
  notes: string | null;
  is_verified: boolean;
  sync_status: string;
  created_at: string;
}

interface InventoryItem {
  id: string;
  item_number: string;
  name: string;
  quantity_on_hand: number;
  unit_of_measure: string;
  category: string;
}

const statusVariant: Record<
  CycleCountSessionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  finalized: "outline",
  cancelled: "destructive",
};

const statusLabel: Record<CycleCountSessionStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  finalized: "Finalized",
  cancelled: "Cancelled",
};

const countTypeLabel: Record<CycleCountSessionType, string> = {
  ad_hoc: "Ad Hoc",
  scheduled_daily: "Daily",
  scheduled_weekly: "Weekly",
  scheduled_monthly: "Monthly",
};

function getVarianceColor(variance: number): string {
  if (variance > 0) {
    return "text-green-600";
  }
  if (variance < 0) {
    return "text-red-600";
  }
  return "";
}

function getVarianceLabel(variance: number): string {
  if (variance > 0) {
    return "Over count";
  }
  if (variance < 0) {
    return "Under count";
  }
  return "No variance";
}

function RecordTableRow({
  record,
  onEdit,
  onVerify,
}: {
  record: CycleCountRecord;
  onEdit: (record: CycleCountRecord) => void;
  onVerify: (record: CycleCountRecord) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{record.item_name}</div>
          <div className="text-sm text-muted-foreground">
            {record.item_number}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right">{record.expected_quantity}</TableCell>
      <TableCell className="text-right">{record.counted_quantity}</TableCell>
      <TableCell className="text-right">
        <span className={getVarianceColor(record.variance)}>
          {record.variance > 0 ? "+" : ""}
          {record.variance.toFixed(2)}
          {record.variance !== 0 && (
            <span className="ml-1 text-xs">
              ({record.variance_pct > 0 ? "+" : ""}
              {record.variance_pct.toFixed(1)}%)
            </span>
          )}
        </span>
      </TableCell>
      <TableCell>
        {record.is_verified ? (
          <Badge variant="outline">
            <CheckCircle2Icon className="mr-1 h-3 w-3" />
            Verified
          </Badge>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!record.is_verified && (
              <>
                <DropdownMenuItem onClick={() => onEdit(record)}>
                  <EditIcon className="mr-2 h-4 w-4" />
                  Edit Count
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onVerify(record)}>
                  <CheckCircleIcon className="mr-2 h-4 w-4" />
                  Verify
                </DropdownMenuItem>
              </>
            )}
            {record.notes && (
              <DropdownMenuItem disabled>
                Notes: {record.notes}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function RecordsTableBody({
  isLoadingRecords,
  records,
  session,
  onAddItem,
  onEdit,
  onVerify,
}: {
  isLoadingRecords: boolean;
  records: CycleCountRecord[];
  session: CycleCountSession;
  onAddItem: () => void;
  onEdit: (record: CycleCountRecord) => void;
  onVerify: (record: CycleCountRecord) => void;
}) {
  if (isLoadingRecords) {
    return (
      <TableRow>
        <TableCell className="py-8 text-center" colSpan={6}>
          <Loader2Icon className="mx-auto h-6 w-6 animate-spin" />
        </TableCell>
      </TableRow>
    );
  }

  if (records.length === 0) {
    return (
      <TableRow>
        <TableCell className="py-8 text-center" colSpan={6}>
          <div className="flex flex-col items-center gap-2">
            <ClipboardCheckIcon className="h-8 w-8 text-muted-foreground" />
            <span>No items counted yet</span>
            {session.status === "in_progress" && (
              <Button onClick={onAddItem} size="sm" variant="outline">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add First Item
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {records.map((record) => (
        <RecordTableRow
          key={record.id}
          onEdit={onEdit}
          onVerify={onVerify}
          record={record}
        />
      ))}
    </>
  );
}

export default function CycleCountSessionDetailPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<CycleCountSession | null>(null);
  const [records, setRecords] = useState<CycleCountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);

  // Add item dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [countedQuantity, setCountedQuantity] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Edit count dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CycleCountRecord | null>(
    null
  );
  const [editQuantity, setEditQuantity] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Complete dialog
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${sessionId}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load session");
      }
      const data = await response.json();
      setSession(data);
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load session"
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const loadRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${sessionId}/records?limit=500`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load records");
      }
      const data = await response.json();
      setRecords(data.data || []);
    } catch (error) {
      console.error("Failed to load records:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load records"
      );
    } finally {
      setIsLoadingRecords(false);
    }
  }, [sessionId]);

  const searchInventoryItems = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setInventoryItems([]);
      return;
    }
    try {
      const response = await apiFetch(
        `/api/inventory/items?search=${encodeURIComponent(query)}&limit=50`
      );
      if (!response.ok) {
        throw new Error("Failed to search items");
      }
      const data = await response.json();
      setInventoryItems(data.data || []);
    } catch (error) {
      console.error("Failed to search inventory:", error);
    }
  }, []);

  useEffect(() => {
    loadSession();
    loadRecords();
  }, [loadSession, loadRecords]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInventoryItems(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchInventoryItems]);

  const handleAddItem = async () => {
    if (!selectedItem) {
      toast.error("Please select an item to count");
      return;
    }
    if (countedQuantity === "") {
      toast.error("Please enter a counted quantity");
      return;
    }

    setIsAddingItem(true);
    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${sessionId}/records`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: selectedItem.id,
            itemNumber: selectedItem.item_number,
            itemName: selectedItem.name,
            storageLocationId: "default",
            expectedQuantity: selectedItem.quantity_on_hand,
            countedQuantity: Number.parseFloat(countedQuantity),
            notes: itemNotes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add item");
      }

      toast.success(`Added count for ${selectedItem.name}`);
      setIsAddDialogOpen(false);
      setSelectedItem(null);
      setSearchQuery("");
      setCountedQuantity("");
      setItemNotes("");
      loadRecords();
      loadSession();
    } catch (error) {
      console.error("Failed to add item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add item"
      );
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleUpdateCount = async () => {
    if (!editingRecord || editQuantity === "") {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await apiFetch(
        "/api/inventory/cycle-count/records/commands/update",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingRecord.id,
            countedQuantity: Number.parseFloat(editQuantity),
            notes: editNotes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update count");
      }

      toast.success("Count updated");
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      loadRecords();
    } catch (error) {
      console.error("Failed to update count:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update count"
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyRecord = async (record: CycleCountRecord) => {
    try {
      const response = await apiFetch(
        "/api/inventory/cycle-count/records/commands/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: record.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify record");
      }

      toast.success(`Verified ${record.item_name}`);
      loadRecords();
    } catch (error) {
      console.error("Failed to verify record:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to verify record"
      );
    }
  };

  const handleCompleteSession = async () => {
    if (!session) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${session.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to complete session");
      }

      toast.success("Session completed");
      setIsCompleteDialogOpen(false);
      loadSession();
    } catch (error) {
      console.error("Failed to complete session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to complete session"
      );
    }
  };

  const handleFinalizeSession = async () => {
    if (!session) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/inventory/cycle-count/sessions/${session.id}/finalize`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to finalize session");
      }

      toast.success("Session finalized");
      loadSession();
    } catch (error) {
      console.error("Failed to finalize session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to finalize session"
      );
    }
  };

  const openEditDialog = (record: CycleCountRecord) => {
    setEditingRecord(record);
    setEditQuantity(record.counted_quantity.toString());
    setEditNotes(record.notes || "");
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangleIcon className="h-12 w-12 text-muted-foreground" />
        <div className="text-lg font-medium">Session not found</div>
        <Button asChild variant="outline">
          <Link href="/warehouse/audits">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Cycle Counts
          </Link>
        </Button>
      </div>
    );
  }

  const progressPercent =
    session.total_items > 0
      ? Math.round((session.counted_items / session.total_items) * 100)
      : 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link href="/warehouse/audits">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {session.session_name}
              </h1>
              <Badge variant={statusVariant[session.status]}>
                {statusLabel[session.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {countTypeLabel[session.count_type]} Count
              {session.scheduled_date && (
                <span>
                  {" "}
                  • Scheduled for{" "}
                  {new Date(session.scheduled_date).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.status === "in_progress" && (
            <>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Item
              </Button>
              <Button
                onClick={() => setIsCompleteDialogOpen(true)}
                variant="outline"
              >
                <CheckCircleIcon className="mr-2 h-4 w-4" />
                Complete Session
              </Button>
            </>
          )}
          {session.status === "completed" && (
            <Button onClick={handleFinalizeSession}>Finalize Session</Button>
          )}
          <Button
            onClick={() => {
              loadSession();
              loadRecords();
            }}
            size="icon"
            variant="ghost"
          >
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <ClipboardCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {session.counted_items} / {session.total_items}
            </div>
            <Progress className="mt-2" value={progressPercent} />
            <p className="mt-1 text-xs text-muted-foreground">
              {progressPercent}% complete
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Variance
            </CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getVarianceColor(session.total_variance)}`}
            >
              {formatCurrency(Math.abs(session.total_variance))}
              {session.total_variance !== 0 && (
                <span className="text-sm">
                  {" "}
                  ({session.total_variance > 0 ? "+" : ""}
                  {session.variance_percentage.toFixed(1)}%)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {getVarianceLabel(session.total_variance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {records.filter((r) => r.is_verified).length} / {records.length}
            </div>
            <p className="text-xs text-muted-foreground">Records verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Started</CardTitle>
            <ClipboardCheckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {session.started_at
                ? new Date(session.started_at).toLocaleDateString()
                : "Not started"}
            </div>
            <p className="text-xs text-muted-foreground">
              {session.started_at
                ? new Date(session.started_at).toLocaleTimeString()
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Count Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Counted</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <RecordsTableBody
                isLoadingRecords={isLoadingRecords}
                onAddItem={() => setIsAddDialogOpen(true)}
                onEdit={openEditDialog}
                onVerify={handleVerifyRecord}
                records={records}
                session={session}
              />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog onOpenChange={setIsAddDialogOpen} open={isAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Item to Count</DialogTitle>
            <DialogDescription>
              Search for an inventory item and enter the counted quantity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Inventory</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search items..."
                  value={searchQuery}
                />
              </div>
              {inventoryItems.length > 0 && !selectedItem && (
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {inventoryItems.map((item) => (
                    <button
                      className="flex w-full items-center justify-between p-2 text-left hover:bg-muted"
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setSearchQuery(item.name);
                        setInventoryItems([]);
                      }}
                      type="button"
                    >
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.item_number}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.quantity_on_hand}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedItem && (
              <>
                <div className="rounded-md border p-3">
                  <div className="font-medium">{selectedItem.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Expected: {selectedItem.quantity_on_hand}{" "}
                    {selectedItem.unit_of_measure}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counted-qty">Counted Quantity *</Label>
                  <Input
                    id="counted-qty"
                    onChange={(e) => setCountedQuantity(e.target.value)}
                    placeholder="Enter counted quantity"
                    type="number"
                    value={countedQuantity}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-notes">Notes</Label>
                  <Textarea
                    id="item-notes"
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="Optional notes..."
                    value={itemNotes}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setIsAddDialogOpen(false);
                setSelectedItem(null);
                setSearchQuery("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedItem || countedQuantity === "" || isAddingItem}
              onClick={handleAddItem}
            >
              {isAddingItem ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Count"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Count Dialog */}
      <Dialog onOpenChange={setIsEditDialogOpen} open={isEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Count</DialogTitle>
            <DialogDescription>
              Update the counted quantity for {editingRecord?.item_name}
            </DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="rounded-md border p-3">
                <div className="font-medium">{editingRecord.item_name}</div>
                <div className="text-sm text-muted-foreground">
                  Expected: {editingRecord.expected_quantity}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-qty">Counted Quantity *</Label>
                <Input
                  id="edit-qty"
                  onChange={(e) => setEditQuantity(e.target.value)}
                  type="number"
                  value={editQuantity}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  onChange={(e) => setEditNotes(e.target.value)}
                  value={editNotes}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={editQuantity === "" || isUpdating}
              onClick={handleUpdateCount}
            >
              {isUpdating ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Count"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Session Dialog */}
      <AlertDialog
        onOpenChange={setIsCompleteDialogOpen}
        open={isCompleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the session as completed.
              {session.counted_items < session.total_items && (
                <span className="mt-2 block text-amber-600">
                  Warning: Only {session.counted_items} of {session.total_items}{" "}
                  items have been counted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteSession}>
              Complete Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
