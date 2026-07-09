"use client";

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
import { Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createQACheck, QA_CHECK_TYPES } from "./create-qa-check";

export function CreateCheckDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkType, setCheckType] = useState("");
  const [location, setLocation] = useState("");
  const [inspector, setInspector] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = useCallback(() => {
    setCheckType("");
    setLocation("");
    setInspector("");
    setNotes("");
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!(checkType && location.trim() && inspector.trim())) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await createQACheck({
          location,
          checkType,
          inspector,
          notes,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success("Quality check created");
        setOpen(false);
        resetForm();
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create check");
      } finally {
        setLoading(false);
      }
    },
    [checkType, location, inspector, notes, onSuccess, resetForm]
  );

  return (
    <Dialog
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          resetForm();
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Quality Check</DialogTitle>
          <DialogDescription>
            Record a new QACheck for HACCP compliance.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="qc-checkType">Check Type *</Label>
            <Select onValueChange={setCheckType} value={checkType}>
              <SelectTrigger id="qc-checkType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {QA_CHECK_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-location">Location *</Label>
            <Input
              id="qc-location"
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Walk-in cooler A"
              required
              value={location}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-inspector">Inspector *</Label>
            <Input
              id="qc-inspector"
              onChange={(e) => setInspector(e.target.value)}
              placeholder="Inspector name"
              required
              value={inspector}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-notes">Notes</Label>
            <Textarea
              id="qc-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              value={notes}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              disabled={
                loading || !checkType || !location.trim() || !inspector.trim()
              }
              type="submit"
            >
              {loading ? "Creating..." : "Create Check"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
