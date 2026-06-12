"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  eventGuestSoftDelete,
  eventGuestUpdate,
} from "@/app/lib/manifest-client.generated";

interface Guest {
  createdAt: string;
  dietaryRestrictions: string[];
  guestEmail: string | null;
  guestName: string;
  guestPhone: string | null;
  id: string;
  mealPreference: string | null;
  notes: string | null;
  rsvpStatus: string;
  specialMealNotes: string | null;
  specialMealRequired: boolean;
  tableAssignment: string | null;
  waitlistPosition: number | null;
}

interface EventGuestsClientProps {
  eventId: string;
  initialGuests: Guest[];
  maxCapacity: number | null;
}

const EMPTY_FORM = {
  guestName: "",
  guestEmail: "",
  guestPhone: "",
  dietaryRestrictions: "",
  tableAssignment: "",
  mealPreference: "",
  notes: "",
};

interface GuestRowProps {
  deleteTarget: string | null;
  editForm: Partial<Guest>;
  editingId: string | null;
  guest: Guest;
  isPending: boolean;
  onDelete: (id: string) => void;
  onDeleteTarget: (id: string | null) => void;
  onEdit: (guest: Guest) => void;
  onRsvpChange: (id: string, status: string) => void;
  onSaveEdit: () => void;
  setEditForm: (form: Partial<Guest>) => void;
  setEditingId: (id: string | null) => void;
}

interface GuestActionsProps {
  deleteTarget: string | null;
  guest: Guest;
  isEditing: boolean;
  isPending: boolean;
  onDelete: (id: string) => void;
  onDeleteTarget: (id: string | null) => void;
  onEdit: (guest: Guest) => void;
  onSaveEdit: () => void;
  setEditForm: (form: Partial<Guest>) => void;
  setEditingId: (id: string | null) => void;
}

function GuestActions({
  guest,
  isEditing,
  isPending,
  deleteTarget,
  onEdit,
  onSaveEdit,
  onDelete,
  onDeleteTarget,
  setEditingId,
  setEditForm,
}: GuestActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {isEditing ? (
        <>
          <Button
            disabled={isPending}
            onClick={onSaveEdit}
            size="sm"
            variant="outline"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              setEditForm({});
            }}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button onClick={() => onEdit(guest)} size="sm" variant="ghost">
            Edit
          </Button>
          {deleteTarget === guest.id ? (
            <>
              <Button
                disabled={isPending}
                onClick={() => onDelete(guest.id)}
                size="sm"
                variant="destructive"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
              <Button
                onClick={() => onDeleteTarget(null)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onDeleteTarget(guest.id)}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function GuestRow({
  guest,
  editingId,
  editForm,
  isPending,
  deleteTarget,
  onRsvpChange,
  onEdit,
  onSaveEdit,
  onDelete,
  onDeleteTarget,
  setEditingId,
  setEditForm,
}: GuestRowProps) {
  const isEditing = editingId === guest.id;

  return (
    <TableRow>
      <TableCell className="font-medium text-ink">
        {isEditing ? (
          <Input
            className="h-8 w-40"
            onChange={(e) =>
              setEditForm({ ...editForm, guestName: e.target.value })
            }
            value={editForm.guestName ?? guest.guestName}
          />
        ) : (
          guest.guestName
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {isEditing ? (
          <div className="space-y-1">
            <Input
              className="h-8"
              onChange={(e) =>
                setEditForm({ ...editForm, guestEmail: e.target.value })
              }
              placeholder="email@example.com"
              value={editForm.guestEmail ?? guest.guestEmail ?? ""}
            />
            <Input
              className="h-8"
              onChange={(e) =>
                setEditForm({ ...editForm, guestPhone: e.target.value })
              }
              placeholder="(555) 123-4567"
              value={editForm.guestPhone ?? guest.guestPhone ?? ""}
            />
          </div>
        ) : (
          <>
            <div>{guest.guestEmail || "\u2014"}</div>
            <div>{guest.guestPhone || "\u2014"}</div>
          </>
        )}
      </TableCell>
      <TableCell>
        <Select
          onValueChange={(val) => onRsvpChange(guest.id, val)}
          value={guest.rsvpStatus.toLowerCase()}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="attending">Attending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="not_attending">Not Attending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-sm">
        {isEditing ? (
          <Input
            className="h-8 w-24"
            onChange={(e) =>
              setEditForm({ ...editForm, tableAssignment: e.target.value })
            }
            value={editForm.tableAssignment ?? guest.tableAssignment ?? ""}
          />
        ) : (
          guest.tableAssignment || "\u2014"
        )}
      </TableCell>
      <TableCell className="text-sm">
        {isEditing ? (
          <Input
            className="h-8 w-24"
            onChange={(e) =>
              setEditForm({ ...editForm, mealPreference: e.target.value })
            }
            value={editForm.mealPreference ?? guest.mealPreference ?? ""}
          />
        ) : (
          guest.mealPreference || "\u2014"
        )}
      </TableCell>
      <TableCell>
        {guest.dietaryRestrictions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {guest.dietaryRestrictions.map((d) => (
              <Badge className="text-xs" key={d} variant="outline">
                {d}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">{"\u2014"}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <GuestActions
          deleteTarget={deleteTarget}
          guest={guest}
          isEditing={isEditing}
          isPending={isPending}
          onDelete={onDelete}
          onDeleteTarget={onDeleteTarget}
          onEdit={onEdit}
          onSaveEdit={onSaveEdit}
          setEditForm={setEditForm}
          setEditingId={setEditingId}
        />
      </TableCell>
    </TableRow>
  );
}

export function EventGuestsClient({
  eventId,
  initialGuests,
  maxCapacity,
}: EventGuestsClientProps) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Guest>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const confirmedCount = guests.filter((g) =>
    ["confirmed", "attending"].includes(g.rsvpStatus.toLowerCase())
  ).length;

  const isAtCapacity = maxCapacity !== null && confirmedCount >= maxCapacity;

  const refreshGuests = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/guests`);
        const json = await res.json();
        if (json.guests) {
          setGuests(
            json.guests.map((g: Guest) => ({
              ...g,
              createdAt: g.createdAt ?? new Date().toISOString(),
            }))
          );
        }
      } catch {
        toast.error("Failed to refresh guest list");
      }
    });
  };

  const handleAddGuest = () => {
    if (!form.guestName.trim()) {
      toast.error("Guest name is required");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/guests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: form.guestName.trim(),
            guestEmail: form.guestEmail.trim() || null,
            guestPhone: form.guestPhone.trim() || null,
            eventId,
            dietaryRestrictions: form.dietaryRestrictions.trim()
              ? form.dietaryRestrictions.split(",").map((s) => s.trim())
              : [],
            tableAssignment: form.tableAssignment.trim() || null,
            mealPreference: form.mealPreference.trim() || null,
            notes: form.notes.trim() || null,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || json.error || "Failed to add guest");
        }
        toast.success(`${form.guestName.trim()} added`);
        setForm(EMPTY_FORM);
        setAddOpen(false);
        refreshGuests();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add guest");
      }
    });
  };

  const handleUpdateRSVP = (guestId: string, status: string) => {
    startTransition(async () => {
      try {
        await eventGuestUpdate({ id: guestId });
        toast.success("RSVP updated");
        refreshGuests();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update RSVP"
        );
      }
    });
  };

  const handleDeleteGuest = (guestId: string) => {
    startTransition(async () => {
      try {
        await eventGuestSoftDelete({ id: guestId });
        toast.success("Guest removed");
        setDeleteTarget(null);
        refreshGuests();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove guest"
        );
      }
    });
  };

  const handleInlineEdit = (guest: Guest) => {
    setEditingId(guest.id);
    setEditForm({
      guestName: guest.guestName,
      guestEmail: guest.guestEmail,
      guestPhone: guest.guestPhone,
      tableAssignment: guest.tableAssignment,
      mealPreference: guest.mealPreference,
      notes: guest.notes,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) {
      return;
    }
    startTransition(async () => {
      try {
        await eventGuestUpdate({
          id: editingId,
          guestName: editForm.guestName,
          guestEmail: editForm.guestEmail ?? undefined,
          guestPhone: editForm.guestPhone ?? undefined,
          tableAssignment: editForm.tableAssignment ?? undefined,
          mealPreference: editForm.mealPreference ?? undefined,
          notes: editForm.notes ?? undefined,
          dietaryRestrictions: Array.isArray(editForm.dietaryRestrictions)
            ? editForm.dietaryRestrictions
            : undefined,
        });
        toast.success("Guest updated");
        setEditingId(null);
        setEditForm({});
        refreshGuests();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update guest"
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Capacity warning */}
      {isAtCapacity && (
        <div className="rounded-[22px] border border-coral/40 bg-coral/5 p-4">
          <p className="font-medium text-coral text-sm">
            Capacity reached — {confirmedCount} of {maxCapacity} spots
            confirmed. New RSVPs will be waitlisted.
          </p>
        </div>
      )}

      {/* Add guest dialog */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {guests.length} {guests.length === 1 ? "guest" : "guests"}
          {maxCapacity !== null && ` (capacity: ${maxCapacity})`}
        </div>
        <Dialog onOpenChange={setAddOpen} open={addOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" /> Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Guest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="add-name">Name *</Label>
                <Input
                  id="add-name"
                  onChange={(e) =>
                    setForm({ ...form, guestName: e.target.value })
                  }
                  placeholder="Full name"
                  value={form.guestName}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-email">Email</Label>
                  <Input
                    id="add-email"
                    onChange={(e) =>
                      setForm({ ...form, guestEmail: e.target.value })
                    }
                    placeholder="email@example.com"
                    type="email"
                    value={form.guestEmail}
                  />
                </div>
                <div>
                  <Label htmlFor="add-phone">Phone</Label>
                  <Input
                    id="add-phone"
                    onChange={(e) =>
                      setForm({ ...form, guestPhone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                    value={form.guestPhone}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-table">Table</Label>
                  <Input
                    id="add-table"
                    onChange={(e) =>
                      setForm({ ...form, tableAssignment: e.target.value })
                    }
                    placeholder="Table 1"
                    value={form.tableAssignment}
                  />
                </div>
                <div>
                  <Label htmlFor="add-meal">Meal preference</Label>
                  <Input
                    id="add-meal"
                    onChange={(e) =>
                      setForm({ ...form, mealPreference: e.target.value })
                    }
                    placeholder="Chicken, Fish, Vegan..."
                    value={form.mealPreference}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-dietary">
                  Dietary restrictions (comma separated)
                </Label>
                <Input
                  id="add-dietary"
                  onChange={(e) =>
                    setForm({ ...form, dietaryRestrictions: e.target.value })
                  }
                  placeholder="Vegetarian, Gluten-free, Nut allergy"
                  value={form.dietaryRestrictions}
                />
              </div>
              <div>
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea
                  id="add-notes"
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional notes"
                  rows={2}
                  value={form.notes}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setAddOpen(false)} variant="outline">
                  Cancel
                </Button>
                <Button disabled={isPending} onClick={handleAddGuest}>
                  {isPending && (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  )}
                  Add Guest
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Guest table */}
      <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Meal</TableHead>
              <TableHead>Dietary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    No guests yet. Add the first guest to get started.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              guests.map((guest) => (
                <GuestRow
                  deleteTarget={deleteTarget}
                  editForm={editForm}
                  editingId={editingId}
                  guest={guest}
                  isPending={isPending}
                  key={guest.id}
                  onDelete={handleDeleteGuest}
                  onDeleteTarget={setDeleteTarget}
                  onEdit={handleInlineEdit}
                  onRsvpChange={handleUpdateRSVP}
                  onSaveEdit={handleSaveEdit}
                  setEditForm={setEditForm}
                  setEditingId={setEditingId}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
