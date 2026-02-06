"use client";

/**
 * Proposal Form Component
 *
 * Reusable form for creating and editing proposals
 */

import type { Proposal } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface LineItem {
  id: string;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface ClientOption {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ProposalFormProps {
  proposal: Proposal | null;
  action: (
    previousState: { redirect: string } | null,
    formData: FormData
  ) => Promise<{ redirect: string } | null>;
  submitLabel: string;
}

const itemTypes = [
  { value: "menu", label: "Menu Item" },
  { value: "service", label: "Service" },
  { value: "rental", label: "Rental Equipment" },
  { value: "staff", label: "Staffing" },
  { value: "fee", label: "Fee" },
  { value: "discount", label: "Discount" },
];

const eventTypes = [
  "Wedding",
  "Corporate Event",
  "Social Gathering",
  "Birthday Party",
  "Anniversary",
  "Graduation",
  "Holiday Party",
  "Fundraiser",
  "Other",
];

function getClientDisplayName(client: ClientOption): string {
  if (client.company_name) {
    return client.company_name;
  }
  return (
    `${client.first_name || ""} ${client.last_name || ""}`.trim() || "No name"
  );
}

export function ProposalForm({
  proposal,
  action,
  submitLabel,
}: ProposalFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    action,
    null as { redirect: string } | null
  );

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  const [newItem, setNewItem] = useState<Partial<LineItem>>({
    itemType: "menu",
    description: "",
    quantity: 1,
    unitPrice: 0,
  });

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const taxRate = proposal?.taxRate
    ? typeof proposal.taxRate === "number"
      ? proposal.taxRate
      : Number(proposal.taxRate)
    : 0;
  const taxAmount = subtotal * (taxRate / 100);
  const discountAmount = proposal?.discountAmount
    ? typeof proposal.discountAmount === "number"
      ? proposal.discountAmount
      : Number(proposal.discountAmount)
    : 0;
  const total = subtotal + taxAmount - discountAmount;

  // Fetch clients on mount
  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await apiFetch("/api/crm/clients?limit=1000");
        if (!response.ok) {
          throw new Error("Failed to fetch clients");
        }
        const data = await response.json();
        setClients(data.data || []);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoadingClients(false);
      }
    }
    fetchClients();
  }, []);

  // Handle redirect after successful submission
  useEffect(() => {
    if (state && typeof state === "object" && "redirect" in state) {
      router.push(state.redirect);
    }
  }, [state, router]);

  const addLineItem = () => {
    if (!(newItem.description && newItem.itemType)) {
      toast.error("Please fill in the required line item fields");
      return;
    }

    setLineItems([
      ...lineItems,
      {
        id: `temp-${Date.now()}`,
        itemType: newItem.itemType,
        description: newItem.description,
        quantity: newItem.quantity || 1,
        unitPrice: newItem.unitPrice || 0,
        notes: newItem.notes,
      },
    ]);

    setNewItem({
      itemType: "menu",
      description: "",
      quantity: 1,
      unitPrice: 0,
    });
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const formatDateValue = (date: Date | string | null | undefined): string => {
    if (!date) {
      return "";
    }
    if (typeof date === "string") {
      return date;
    }
    return format(date, "yyyy-MM-dd");
  };

  return (
    <form action={formAction} className="space-y-6">
      {proposal?.id && (
        <input name="proposalId" type="hidden" value={proposal.id} />
      )}
      <input name="lineItems" type="hidden" value={JSON.stringify(lineItems)} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core details about the proposal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Proposal Title *</Label>
                  <Input
                    defaultValue={proposal?.title || ""}
                    id="title"
                    name="title"
                    placeholder="Annual Company Gala"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientId">Client</Label>
                  <Select
                    defaultValue={proposal?.clientId || ""}
                    name="clientId"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No client selected</SelectItem>
                      {isLoadingClients ? (
                        <SelectItem disabled value="loading">
                          Loading clients...
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {getClientDisplayName(client)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    defaultValue={proposal?.eventType || ""}
                    name="eventType"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Not specified</SelectItem>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date</Label>
                  <Input
                    defaultValue={formatDateValue(proposal?.eventDate)}
                    id="eventDate"
                    name="eventDate"
                    type="date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guestCount">Guest Count</Label>
                  <Input
                    defaultValue={proposal?.guestCount || ""}
                    id="guestCount"
                    min="0"
                    name="guestCount"
                    placeholder="100"
                    type="number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    defaultValue={proposal?.status || "draft"}
                    name="status"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="viewed">Viewed</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name</Label>
                  <Input
                    defaultValue={proposal?.venueName || ""}
                    id="venueName"
                    name="venueName"
                    placeholder="Grand Ballroom"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venueAddress">Venue Address</Label>
                  <Input
                    defaultValue={proposal?.venueAddress || ""}
                    id="venueAddress"
                    name="venueAddress"
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  defaultValue={proposal?.notes || ""}
                  id="notes"
                  name="notes"
                  placeholder="Additional notes about the proposal..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Proposal Items</CardTitle>
              <CardDescription>
                Add menu items, services, and fees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new line item */}
              <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/50">
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="new-item-type">
                      Type
                    </Label>
                    <Select
                      onValueChange={(value) =>
                        setNewItem({ ...newItem, itemType: value })
                      }
                      value={newItem.itemType}
                    >
                      <SelectTrigger id="new-item-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs" htmlFor="new-item-desc">
                      Description
                    </Label>
                    <Input
                      id="new-item-desc"
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                      placeholder="Item description"
                      value={newItem.description}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="new-item-qty">
                      Qty
                    </Label>
                    <Input
                      id="new-item-qty"
                      min="0"
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          quantity: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="1"
                      type="number"
                      value={newItem.quantity}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor="new-item-price">
                      Unit Price
                    </Label>
                    <Input
                      id="new-item-price"
                      min="0"
                      onChange={(e) =>
                        setNewItem({
                          ...newItem,
                          unitPrice: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      step="0.01"
                      type="number"
                      value={newItem.unitPrice}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={addLineItem}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Line items table */}
              {lineItems.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge className="text-xs" variant="outline">
                              {itemTypes.find((t) => t.value === item.itemType)
                                ?.label || item.itemType}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => removeLineItem(item.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {lineItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No items added yet. Add items above to build your proposal.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                defaultValue={proposal?.termsAndConditions || ""}
                name="termsAndConditions"
                placeholder="Enter terms and conditions for this proposal..."
                rows={6}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  defaultValue={
                    proposal?.taxRate
                      ? typeof proposal.taxRate === "number"
                        ? proposal.taxRate
                        : Number(proposal.taxRate)
                      : 0
                  }
                  id="taxRate"
                  min="0"
                  name="taxRate"
                  placeholder="8.5"
                  step="0.01"
                  type="number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountAmount">Discount Amount</Label>
                <Input
                  defaultValue={
                    proposal?.discountAmount
                      ? typeof proposal.discountAmount === "number"
                        ? proposal.discountAmount
                        : Number(proposal.discountAmount)
                      : 0
                  }
                  id="discountAmount"
                  min="0"
                  name="discountAmount"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax ({taxRate}%)
                  </span>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">
                      -${discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valid Until */}
          <Card>
            <CardHeader>
              <CardTitle>Expiration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  defaultValue={formatDateValue(proposal?.validUntil)}
                  id="validUntil"
                  name="validUntil"
                  type="date"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiration
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Saving..." : submitLabel}
            </Button>
            <Button
              disabled={isPending}
              onClick={() => router.back()}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
