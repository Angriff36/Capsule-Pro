"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useEffect, useState } from "react";
import type { PaletteStaff } from "../actions";

/** Formats a Date as a `datetime-local` input value in LOCAL time. */
function toDatetimeLocalInput(base: Date, hours: number): string {
  const d = new Date(base);
  d.setHours(hours, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface ShiftDialogSubmit {
  role: string;
  /** ISO strings */
  shiftStart: string;
  shiftEnd: string;
}

interface ShiftDialogProps {
  /** Non-null opens the dialog for this palette member. */
  staff: PaletteStaff | null;
  /** Event date ISO string — shift defaults to 16:00–23:00 local on this day. */
  eventDate: string;
  pending: boolean;
  errorMessage: string | null;
  onConfirm: (input: ShiftDialogSubmit) => void;
  onClose: () => void;
}

export function ShiftDialog({
  staff,
  eventDate,
  pending,
  errorMessage,
  onConfirm,
  onClose,
}: ShiftDialogProps) {
  const [role, setRole] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Re-seed inputs each time the dialog opens for a new palette member.
  useEffect(() => {
    if (!staff) return;
    const base = new Date(eventDate);
    setRole(staff.role);
    setStart(toDatetimeLocalInput(base, 16));
    setEnd(toDatetimeLocalInput(base, 23));
  }, [staff, eventDate]);

  const valid =
    role.trim().length > 0 &&
    start !== "" &&
    end !== "" &&
    new Date(end) > new Date(start);

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={staff !== null}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add staff draft</DialogTitle>
          <DialogDescription>
            {staff ? `Assign ${staff.name} to this event as a draft.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="shift-role">Role</Label>
            <Input
              id="shift-role"
              onChange={(e) => setRole(e.target.value)}
              value={role}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-start">Shift start</Label>
            <Input
              id="shift-start"
              onChange={(e) => setStart(e.target.value)}
              type="datetime-local"
              value={start}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shift-end">Shift end</Label>
            <Input
              id="shift-end"
              onChange={(e) => setEnd(e.target.value)}
              type="datetime-local"
              value={end}
            />
          </div>
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!valid || pending}
            onClick={() =>
              onConfirm({
                role: role.trim(),
                shiftStart: new Date(start).toISOString(),
                shiftEnd: new Date(end).toISOString(),
              })
            }
          >
            {pending ? "Adding…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
