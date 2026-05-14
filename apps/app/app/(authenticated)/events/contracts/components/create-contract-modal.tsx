/**
 * @module CreateContractModal
 * @intent Modal dialog for creating a new contract
 * @responsibility Render contract creation form and submit to API
 * @domain Events
 * @tags contracts, creation, modal
 * @canonical true
 */

"use client";

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
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface EventOption {
  id: string;
  title: string;
  eventDate: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface CreateContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: EventOption[];
  clients: ClientOption[];
}

export function CreateContractModal({
  open,
  onOpenChange,
  events,
  clients,
}: CreateContractModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form state
  const [eventId, setEventId] = useState("");
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setEventId("");
    setClientId("");
    setTitle("");
    setContractNumber("");
    setNotes("");
    setExpiresAt("");
    setErrors({});
  }, []);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!eventId) newErrors.eventId = "Event is required";
    if (!clientId) newErrors.clientId = "Client is required";
    if (!title.trim()) newErrors.title = "Title is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [eventId, clientId, title]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await apiFetch(
        "/api/manifest/EventContract/commands/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            clientId,
            title: title.trim(),
            contractNumber: contractNumber.trim() || undefined,
            documentUrl: "",
            documentType: "",
            notes: notes.trim() || undefined,
            expiresAt: expiresAt ? new Date(expiresAt).getTime() : 0,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create contract");
      }

      const data = await response.json();
      const contractId =
        data.result?.id || data.result?.contractId || data.result?.id;

      toast.success("Contract created successfully");
      onOpenChange(false);
      resetForm();

      // Navigate to the new contract
      if (contractId) {
        router.push(`/events/contracts/${contractId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error("Error creating contract:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create contract"
      );
    } finally {
      setLoading(false);
    }
  }, [
    validate,
    eventId,
    clientId,
    title,
    contractNumber,
    notes,
    expiresAt,
    onOpenChange,
    resetForm,
    router,
  ]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Contract</DialogTitle>
          <DialogDescription>
            Create a new contract for an event. You can upload documents and
            capture signatures after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Event */}
          <div className="grid gap-2">
            <Label htmlFor="contract-event">Event *</Label>
            <Select onValueChange={setEventId} value={eventId}>
              <SelectTrigger id="contract-event">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                    <span className="ml-2 text-muted-foreground text-xs">
                      (
                      {new Date(event.eventDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      )
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.eventId && (
              <p className="text-destructive text-sm">{errors.eventId}</p>
            )}
          </div>

          {/* Client */}
          <div className="grid gap-2">
            <Label htmlFor="contract-client">Client *</Label>
            <Select onValueChange={setClientId} value={clientId}>
              <SelectTrigger id="contract-client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-destructive text-sm">{errors.clientId}</p>
            )}
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="contract-title">Contract Title *</Label>
            <Input
              id="contract-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Catering Services Agreement"
              value={title}
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title}</p>
            )}
          </div>

          {/* Contract Number */}
          <div className="grid gap-2">
            <Label htmlFor="contract-number">Contract Number</Label>
            <Input
              id="contract-number"
              onChange={(e) => setContractNumber(e.target.value)}
              placeholder="Auto-generated if left blank"
              value={contractNumber}
            />
          </div>

          {/* Expiration Date */}
          <div className="grid gap-2">
            <Label htmlFor="contract-expires">Expiration Date</Label>
            <DatePicker
              id="contract-expires"
              onChange={(e) => setExpiresAt(e.target.value)}
              value={expiresAt}
            />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="contract-notes">Notes</Label>
            <Textarea
              id="contract-notes"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional contract notes..."
              rows={3}
              value={notes}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={loading}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={loading} onClick={handleSubmit}>
            {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Create Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
