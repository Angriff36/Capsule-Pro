"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendProposal } from "../actions";

interface SendProposalButtonProps {
  clientEmail?: string | null;
  clientName?: string | null;
  proposalId: string;
}

export function SendProposalButton({
  proposalId,
  clientEmail,
  clientName,
}: SendProposalButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [recipientEmail, setRecipientEmail] = useState(clientEmail ?? "");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!recipientEmail.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    startTransition(async () => {
      try {
        const result = await sendProposal(proposalId, {
          recipientEmail: recipientEmail.trim(),
          message: message.trim() || undefined,
        });

        if (result.success) {
          toast.success(`Proposal sent to ${result.sentTo}`);
          setIsOpen(false);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to send proposal"
        );
      }
    });
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Send Proposal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Proposal</DialogTitle>
          <DialogDescription>
            Send this proposal to {clientName || "the client"} via email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email *</Label>
            <Input
              id="recipient-email"
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@example.com"
              type="email"
              value={recipientEmail}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="send-message">Personal Message (optional)</Label>
            <Textarea
              id="send-message"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to the proposal email..."
              rows={3}
              value={message}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setIsOpen(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isPending || !recipientEmail.trim()}
            onClick={handleSend}
          >
            {isPending ? (
              "Sending..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
