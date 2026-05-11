"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import {
  CheckCircle,
  CreditCard,
  Loader2,
  MoreHorizontal,
  Plus,
  Shield,
  ShieldAlert,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";

interface PaymentMethodEntry {
  id: string;
  type: string;
  cardLastFour: string | null;
  cardNetwork: string | null;
  isDefault: boolean;
  status: string;
  clientId: string;
  displayInfo: string;
  clientLabel: string;
  createdAt: string;
}

interface PaymentMethodsClientProps {
  initialMethods: PaymentMethodEntry[];
  metrics: {
    totalCount: number;
    activeCount: number;
    verifiedCount: number;
    flaggedCount: number;
  };
}

const TYPE_OPTIONS = [
  { value: "ALL", label: "All types" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "ACH", label: "ACH Transfer" },
  { value: "WIRE_TRANSFER", label: "Wire Transfer" },
  { value: "DIGITAL_WALLET", label: "Digital Wallet" },
  { value: "CHECK", label: "Check" },
  { value: "CASH", label: "Cash" },
] as const;

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "VERIFIED", label: "Verified" },
  { value: "FLAGGED", label: "Flagged" },
  { value: "EXPIRED", label: "Expired" },
] as const;

function formatTypeLabel(type: string): string {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "secondary";
    case "VERIFIED":
      return "default";
    case "FLAGGED":
      return "destructive";
    case "EXPIRED":
      return "outline";
    default:
      return "secondary";
  }
}

export function PaymentMethodsClient({
  initialMethods,
}: PaymentMethodsClientProps) {
  const [methods, setMethods] = useState<PaymentMethodEntry[]>(initialMethods);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [formType, setFormType] = useState("CREDIT_CARD");
  const [formClientId, setFormClientId] = useState("");
  const [formCardLastFour, setFormCardLastFour] = useState("");
  const [formCardNetwork, setFormCardNetwork] = useState("VISA");
  const [formIsDefault, setFormIsDefault] = useState(false);

  const filteredMethods = methods.filter((m) => {
    if (typeFilter !== "ALL" && m.type !== typeFilter) return false;
    if (statusFilter !== "ALL" && m.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.displayInfo.toLowerCase().includes(q) ||
        m.clientLabel.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetCreateForm = useCallback(() => {
    setFormType("CREDIT_CARD");
    setFormClientId("");
    setFormCardLastFour("");
    setFormCardNetwork("VISA");
    setFormIsDefault(false);
  }, []);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        clientId: formClientId,
        type: formType,
        isDefault: formIsDefault,
      };

      if (formType === "CREDIT_CARD" || formType === "DEBIT_CARD") {
        if (formCardLastFour) body.cardLastFour = formCardLastFour;
        if (formCardNetwork) body.cardNetwork = formCardNetwork;
      }

      const res = await fetch("/api/accounting/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create payment method");
      }

      const created = await res.json();

      setMethods((prev) => [
        {
          id: created.id,
          type: created.type,
          cardLastFour: created.cardLastFour,
          cardNetwork: created.cardNetwork,
          isDefault: created.isDefault,
          status: created.status,
          clientId: created.clientId,
          displayInfo: created.displayInfo,
          clientLabel: "New method",
          createdAt: created.createdAt,
        },
        ...prev,
      ]);

      setCreateDialogOpen(false);
      resetCreateForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(message);
    } finally {
      setCreating(false);
    }
  }, [
    formClientId,
    formType,
    formIsDefault,
    formCardLastFour,
    formCardNetwork,
    resetCreateForm,
  ]);

  const handleAction = useCallback(
    async (methodId: string, action: string) => {
      setActionLoading(methodId);
      try {
        const res = await fetch(`/api/accounting/payment-methods/${methodId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Action failed");
        }

        if (action === "remove") {
          setMethods((prev) => prev.filter((m) => m.id !== methodId));
        } else {
          const updated = await res.json();
          setMethods((prev) =>
            prev.map((m) =>
              m.id === methodId
                ? {
                    ...m,
                    isDefault:
                      action === "mark-as-default" ? true : m.isDefault,
                    status:
                      action === "verify"
                        ? "VERIFIED"
                        : action === "flag-for-fraud"
                          ? "FLAGGED"
                          : action === "mark-expired"
                            ? "EXPIRED"
                            : m.status,
                    displayInfo: updated.displayInfo ?? m.displayInfo,
                  }
                : action === "mark-as-default" && m.clientId === updated.clientId
                  ? { ...m, isDefault: false }
                  : m,
            ),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        alert(message);
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-[220px]"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search methods..."
          value={searchQuery}
        />
        <Select onValueChange={setTypeFilter} value={typeFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add payment method</DialogTitle>
                <DialogDescription>
                  Register a new payment method for a client.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="pm-client-id">Client ID</Label>
                  <Input
                    id="pm-client-id"
                    onChange={(e) => setFormClientId(e.target.value)}
                    placeholder="Enter client UUID"
                    value={formClientId}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pm-type">Type</Label>
                  <Select onValueChange={setFormType} value={formType}>
                    <SelectTrigger id="pm-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.filter((o) => o.value !== "ALL").map(
                        (opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {(formType === "CREDIT_CARD" || formType === "DEBIT_CARD") && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="pm-last-four">Last four digits</Label>
                      <Input
                        id="pm-last-four"
                        maxLength={4}
                        onChange={(e) => setFormCardLastFour(e.target.value)}
                        placeholder="e.g. 4242"
                        value={formCardLastFour}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pm-network">Card network</Label>
                      <Select
                        onValueChange={setFormCardNetwork}
                        value={formCardNetwork}
                      >
                        <SelectTrigger id="pm-network">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VISA">Visa</SelectItem>
                          <SelectItem value="MASTERCARD">
                            Mastercard
                          </SelectItem>
                          <SelectItem value="AMEX">Amex</SelectItem>
                          <SelectItem value="DISCOVER">Discover</SelectItem>
                          <SelectItem value="DINERS_CLUB">
                            Diners Club
                          </SelectItem>
                          <SelectItem value="JCB">JCB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    checked={formIsDefault}
                    className="h-4 w-4 rounded border-border"
                    id="pm-default"
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    type="checkbox"
                  />
                  <Label htmlFor="pm-default">Set as default for client</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  disabled={creating || !formClientId}
                  onClick={handleCreate}
                >
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {creating ? "Creating..." : "Create method"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      {filteredMethods.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
          {methods.length === 0
            ? "No payment methods have been saved for this tenant yet."
            : "No payment methods match the current filters."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <div className="grid grid-cols-[1fr_0.85fr_0.7fr_0.6fr_0.65fr_0.55fr_0.4fr] gap-4 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Method</span>
            <span>Client</span>
            <span>Type</span>
            <span>Status</span>
            <span>Default</span>
            <span>Added</span>
            <span className="sr-only">Actions</span>
          </div>
          {filteredMethods.map((method) => (
            <div
              className="grid grid-cols-[1fr_0.85fr_0.7fr_0.6fr_0.65fr_0.55fr_0.4fr] gap-4 border-b border-hairline px-5 py-4 text-sm last:border-b-0"
              key={method.id}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-ink">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  {method.displayInfo}
                </div>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <div>{method.clientLabel}</div>
              </div>
              <div className="text-muted-foreground">
                {formatTypeLabel(method.type)}
              </div>
              <div>
                <Badge variant={getStatusBadgeVariant(method.status)}>
                  {method.status}
                </Badge>
              </div>
              <div>
                {method.isDefault ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-ink">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    Default
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {"\u2014"}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground">
                {new Date(method.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={actionLoading === method.id}
                      size="icon"
                      variant="ghost"
                    >
                      {actionLoading === method.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!method.isDefault && (
                      <DropdownMenuItem
                        onClick={() =>
                          handleAction(method.id, "mark-as-default")
                        }
                      >
                        <Star className="mr-2 h-4 w-4" />
                        Mark as default
                      </DropdownMenuItem>
                    )}
                    {method.status !== "VERIFIED" && (
                      <DropdownMenuItem
                        onClick={() => handleAction(method.id, "verify")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Verify
                      </DropdownMenuItem>
                    )}
                    {method.status !== "FLAGGED" && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          handleAction(method.id, "flag-for-fraud")
                        }
                      >
                        <ShieldAlert className="mr-2 h-4 w-4" />
                        Flag for fraud
                      </DropdownMenuItem>
                    )}
                    {method.status !== "EXPIRED" && (
                      <DropdownMenuItem
                        onClick={() => handleAction(method.id, "mark-expired")}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Mark expired
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleAction(method.id, "remove")}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
