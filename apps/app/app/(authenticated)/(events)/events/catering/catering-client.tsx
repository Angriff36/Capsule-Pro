"use client";

import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  cateringOrderCancel,
  cateringOrderConfirm,
  cateringOrderCreate,
  cateringOrderMarkComplete,
  cateringOrderStartPrep,
  listCateringOrders,
} from "@/app/lib/manifest-client.generated";

// Field names match the CateringOrder Prisma model returned verbatim by the
// generated list route (orderStatus/totalAmount — NOT status/total).
interface CateringOrder {
  createdAt: string;
  customerId: string;
  deliveryDate: string;
  deliveryTime: string;
  depositAmount: string | null;
  depositPaid: boolean;
  depositRequired: boolean;
  dietaryRestrictions: string | null;
  eventId: string | null;
  guestCount: number;
  id: string;
  orderDate: string;
  orderNumber: string;
  orderStatus: string;
  serviceChargeAmount: string;
  staffAssigned: number | null;
  staffRequired: number | null;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  updatedAt: string;
  venueCity: string | null;
  venueName: string | null;
  venueState: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; variant: string }
> = {
  draft: {
    label: "Draft",
    icon: <Clock className="mr-1 size-3" />,
    variant: "neutral",
  },
  confirmed: {
    label: "Confirmed",
    icon: <CheckCircle className="mr-1 size-3" />,
    variant: "success",
  },
  in_progress: {
    label: "In Progress",
    icon: <RefreshCw className="mr-1 size-3" />,
    variant: "info",
  },
  completed: {
    label: "Completed",
    icon: <CheckCircle className="mr-1 size-3" />,
    variant: "success",
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle className="mr-1 size-3" />,
    variant: "error",
  },
};

const NEXT_ACTION: Record<string, { label: string; command: string }> = {
  draft: { label: "Confirm", command: "confirm" },
  confirmed: { label: "Start Prep", command: "startPrep" },
  in_progress: { label: "Mark Complete", command: "markComplete" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PAGE_SIZE = 25;

export function CateringClient() {
  const [allOrders, setAllOrders] = useState<CateringOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CateringOrder | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerId: "",
    deliveryDate: "",
    deliveryTime: "12:00",
    venueName: "",
    venueAddress: "",
    venueCity: "",
    venueState: "",
    venueZip: "",
    venueContactName: "",
    venueContactPhone: "",
    guestCount: "50",
    specialInstructions: "",
    dietaryRestrictions: "",
    subtotal: "0.00",
    tax: "0.00",
    serviceCharge: "0.00",
  });

  // The generated list route ignores query params (status/search/pagination),
  // so fetch everything once and filter/paginate client-side.
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listCateringOrders();
      setAllOrders(result.data as unknown as CateringOrder[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load catering orders"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = allOrders.filter((order) => {
    if (statusFilter !== "all" && order.orderStatus !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        (order.venueName ?? "").toLowerCase().includes(q) ||
        (order.venueCity ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });
  const totalCount = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const orders = filteredOrders.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleStatusAction = async (order: CateringOrder) => {
    const action = NEXT_ACTION[order.orderStatus];
    if (!action) {
      return;
    }
    setActioning(order.id);
    try {
      // Typed command client → canonical dispatcher.
      const commandMap: Record<
        string,
        (input: Record<string, unknown>) => Promise<unknown>
      > = {
        confirm: cateringOrderConfirm,
        startPrep: cateringOrderStartPrep,
        markComplete: cateringOrderMarkComplete,
      };
      const fn = commandMap[action.command];
      if (fn) {
        await fn({ id: order.id });
      }
      toast.success(`Order ${action.label.toLowerCase()}ed successfully`);
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActioning(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) {
      return;
    }
    setActioning(cancelTarget.id);
    try {
      await cateringOrderCancel({
        id: cancelTarget.id,
        reason: "Cancelled by user",
      });
      toast.success("Order cancelled");
      setCancelTarget(null);
      await loadOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActioning(null);
    }
  };

  const handleCreate = async () => {
    try {
      await cateringOrderCreate({
        customerId: form.customerId,
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        venueCity: form.venueCity,
        venueState: form.venueState,
        venueZip: form.venueZip,
        venueContactName: form.venueContactName,
        venueContactPhone: form.venueContactPhone,
        guestCount: Number(form.guestCount),
        specialInstructions: form.specialInstructions,
      });
      toast.success("Catering order created");
      setCreateOpen(false);
      setForm({
        customerId: "",
        deliveryDate: "",
        deliveryTime: "12:00",
        venueName: "",
        venueAddress: "",
        venueCity: "",
        venueState: "",
        venueZip: "",
        venueContactName: "",
        venueContactPhone: "",
        guestCount: "50",
        specialInstructions: "",
        dietaryRestrictions: "",
        subtotal: "0.00",
        tax: "0.00",
        serviceCharge: "0.00",
      });
      await loadOrders();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create order"
      );
    }
  };

  const canCancel = (status: string) => ["draft", "confirmed"].includes(status);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-10"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search orders..."
              value={searchInput}
            />
          </div>
          <Select
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            value={statusFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadOrders} size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-2 size-4" />
            New Order
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-8 text-muted-foreground text-sm">
          {allOrders.length === 0
            ? "No catering orders found. Create your first order to get started."
            : "No orders match the current filters. Adjust the status filter or search."}
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <div className="grid grid-cols-[1fr_120px_120px_100px_110px_140px] gap-3 border-hairline border-b px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            <span>Order</span>
            <span>Delivery</span>
            <span className="text-right">Total</span>
            <span>Guests</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.orderStatus] ?? {
              label: order.orderStatus,
              icon: null,
              variant: "neutral",
            };
            const nextAction = NEXT_ACTION[order.orderStatus];
            return (
              <div
                className="grid grid-cols-[1fr_120px_120px_100px_110px_140px] gap-3 border-hairline border-b px-5 py-4 text-sm last:border-b-0"
                key={order.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.orderNumber}</p>
                  <p className="truncate text-muted-foreground text-xs">
                    {order.venueName ?? "No venue"}
                    {order.venueCity ? `, ${order.venueCity}` : ""}
                  </p>
                </div>
                <span className="text-muted-foreground">
                  {formatDate(order.deliveryDate)}
                </span>
                <span className="text-right font-mono">
                  {formatCurrency(order.totalAmount)}
                </span>
                <span className="text-muted-foreground">
                  {order.guestCount}
                </span>
                <StatusPill>
                  {statusCfg.icon}
                  {statusCfg.label}
                </StatusPill>
                <div className="flex items-center justify-end gap-1">
                  {nextAction && (
                    <Button
                      disabled={actioning === order.id}
                      onClick={() => handleStatusAction(order)}
                      size="sm"
                      variant="outline"
                    >
                      <ChevronRight className="mr-1 size-3" />
                      {nextAction.label}
                    </Button>
                  )}
                  {canCancel(order.orderStatus) && !nextAction && (
                    <Button
                      disabled={actioning === order.id}
                      onClick={() => setCancelTarget(order)}
                      size="sm"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 text-sm">
          <span className="text-muted-foreground">
            Showing {(safePage - 1) * PAGE_SIZE + 1}-
            {Math.min(safePage * PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Catering Order</DialogTitle>
            <DialogDescription>
              Create a new catering order. It will start in draft status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium text-sm">Customer ID</label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerId: e.target.value }))
                  }
                  placeholder="Customer UUID"
                  value={form.customerId}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm">Guest Count</label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({ ...f, guestCount: e.target.value }))
                  }
                  placeholder="50"
                  type="number"
                  value={form.guestCount}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium text-sm">Delivery Date</label>
                <DatePicker
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deliveryDate: e.target.value }))
                  }
                  value={form.deliveryDate}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm">Delivery Time</label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deliveryTime: e.target.value }))
                  }
                  type="time"
                  value={form.deliveryTime}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-medium text-sm">Venue Name</label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({ ...f, venueName: e.target.value }))
                  }
                  placeholder="Grand Ballroom"
                  value={form.venueName}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm">Venue City</label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({ ...f, venueCity: e.target.value }))
                  }
                  placeholder="New York"
                  value={form.venueCity}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm">
                Special Instructions
              </label>
              <Textarea
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    specialInstructions: e.target.value,
                  }))
                }
                placeholder="Setup by 3pm, use back entrance..."
                rows={3}
                value={form.specialInstructions}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm">
                Dietary Restrictions
              </label>
              <Input
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dietaryRestrictions: e.target.value,
                  }))
                }
                placeholder="Vegan options, nut-free, gluten-free"
                value={form.dietaryRestrictions}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="font-medium text-sm">Subtotal ($)</label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subtotal: e.target.value }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={form.subtotal}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm">Tax ($)</label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tax: e.target.value }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={form.tax}
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm">
                  Service Charge ($)
                </label>
                <Input
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      serviceCharge: e.target.value,
                    }))
                  }
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={form.serviceCharge}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreateOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!(form.customerId && form.deliveryDate)}
              onClick={handleCreate}
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => !open && setCancelTarget(null)}
        open={!!cancelTarget}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel order {cancelTarget?.orderNumber}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setCancelTarget(null)} variant="outline">
              Keep Order
            </Button>
            <Button
              disabled={actioning === cancelTarget?.id}
              onClick={handleCancel}
              variant="destructive"
            >
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
