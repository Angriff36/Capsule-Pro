"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  CalendarIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createClientInteraction,
  getClientInteractions,
} from "../../../../actions";

interface CommunicationsTabProps {
  clientId: string;
}

const INTERACTION_TYPES = [
  { value: "email", label: "Email", icon: MailIcon },
  { value: "call", label: "Phone Call", icon: PhoneIcon },
  { value: "meeting", label: "Meeting", icon: UserIcon },
  { value: "note", label: "Note", icon: MessageSquareIcon },
];

export function CommunicationsTab({ clientId }: CommunicationsTabProps) {
  const [interactions, setInteractions] = useState<
    Array<{
      id: string;
      interactionType: string;
      subject: string | null;
      description: string | null;
      interactionDate: Date;
      followUpDate: Date | null;
      followUpCompleted: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    interactionType: "note",
    subject: "",
    description: "",
    followUpDate: "",
  });

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const data = await getClientInteractions(clientId);
      setInteractions(data.data);
    } catch (error) {
      toast.error("Failed to load communications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createClientInteraction(clientId, {
        interactionType: formData.interactionType,
        subject: formData.subject || undefined,
        description: formData.description || undefined,
        followUpDate: formData.followUpDate || undefined,
      });
      toast.success("Interaction logged successfully");
      setDialogOpen(false);
      setFormData({
        interactionType: "note",
        subject: "",
        description: "",
        followUpDate: "",
      });
      fetchInteractions();
    } catch (error) {
      toast.error("Failed to log interaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getInteractionIcon = (type: string) => {
    const interaction = INTERACTION_TYPES.find((t) => t.value === type);
    const Icon = interaction?.icon || MessageSquareIcon;
    return <Icon className="h-4 w-4" />;
  };

  const getInteractionLabel = (type: string) => {
    const interaction = INTERACTION_TYPES.find((t) => t.value === type);
    return interaction?.label || type;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Communication History ({interactions.length})
        </h2>
        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Log Interaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Communication</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="interactionType">Type *</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  id="interactionType"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interactionType: e.target.value,
                    })
                  }
                  required
                  value={formData.interactionType}
                >
                  {INTERACTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Event planning discussion"
                  value={formData.subject}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Details of the conversation..."
                  required
                  rows={3}
                  value={formData.description}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  onChange={(e) =>
                    setFormData({ ...formData, followUpDate: e.target.value })
                  }
                  type="date"
                  value={formData.followUpDate}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setDialogOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={submitting} type="submit">
                  Log Interaction
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading communications...
        </div>
      ) : interactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquareIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No communications yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Log your first interaction with this client to start tracking your
              communication history.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Log First Interaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <Card key={interaction.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {getInteractionIcon(interaction.interactionType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {getInteractionLabel(interaction.interactionType)}
                        </span>
                        <Badge className="text-xs" variant="outline">
                          {new Date(
                            interaction.interactionDate
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Badge>
                      </div>
                    </div>
                    {interaction.subject && (
                      <div className="font-medium text-sm mb-1">
                        {interaction.subject}
                      </div>
                    )}
                    {interaction.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {interaction.description}
                      </p>
                    )}
                    {interaction.followUpDate && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        Follow-up:{" "}
                        {new Date(interaction.followUpDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                        {!interaction.followUpCompleted && (
                          <Badge className="ml-2 text-xs" variant="secondary">
                            Pending
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
