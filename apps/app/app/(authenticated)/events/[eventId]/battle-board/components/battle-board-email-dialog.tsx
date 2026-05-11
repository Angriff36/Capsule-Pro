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
import { LoaderIcon, MailIcon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BattleBoardEmailDialogProps {
  eventId: string;
  eventName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BattleBoardEmailDialog({
  eventId,
  eventName,
  open,
  onOpenChange,
}: BattleBoardEmailDialogProps) {
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [isSending, setIsSending] = useState(false);

  const handleAddRecipient = () => {
    setRecipients((prev) => [...prev, ""]);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRecipientChange = (index: number, value: string) => {
    setRecipients((prev) => prev.map((r, i) => (i === index ? value : r)));
  };

  const handleSend = async () => {
    const validRecipients = recipients
      .map((r) => r.trim())
      .filter((r) => r.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

    if (validRecipients.length === 0) {
      toast.error("Please enter at least one valid email address");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/events/${eventId}/battle-board/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients: validRecipients,
            eventName,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send email");
      }

      toast.success(
        `Battle Board PDF sent to ${validRecipients.length} recipient(s)`
      );
      onOpenChange(false);
      setRecipients([""]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send email"
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Battle Board PDF</DialogTitle>
          <DialogDescription>
            Send the Battle Board for &ldquo;{eventName}&rdquo; as a PDF
            attachment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {recipients.map((email, index) => (
            <div className="flex items-center gap-2" key={index}>
              <Input
                onChange={(e) => handleRecipientChange(index, e.target.value)}
                placeholder="email@example.com"
                type="email"
                value={email}
              />
              {recipients.length > 1 && (
                <Button
                  className="shrink-0"
                  onClick={() => handleRemoveRecipient(index)}
                  size="icon"
                  variant="ghost"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            className="w-full"
            onClick={handleAddRecipient}
            size="sm"
            variant="outline"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add recipient
          </Button>
        </div>
        <DialogFooter>
          <Button
            className="border-white/25 bg-transparent text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSending} onClick={handleSend}>
            {isSending ? (
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MailIcon className="mr-2 h-4 w-4" />
            )}
            Send PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
