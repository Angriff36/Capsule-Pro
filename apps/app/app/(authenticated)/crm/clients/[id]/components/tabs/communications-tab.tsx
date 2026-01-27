"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  CalendarIcon,
  CheckIcon,
  MailIcon,
  MessageSquareIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createClientInteraction,
  deleteClientInteraction,
  getClientInteractions,
  updateClientInteraction,
} from "../../../actions";

type CommunicationsTabProps = {
  clientId: string;
};

type Interaction = {
  id: string;
  interactionType: string;
  subject: string | null;
  description: string | null;
  interactionDate: Date;
  followUpDate: Date | null;
  followUpCompleted: boolean;
};

const INTERACTION_TYPES = [
  { value: "email", label: "Email", icon: MailIcon },
  { value: "call", label: "Phone Call", icon: PhoneIcon },
  { value: "meeting", label: "Meeting", icon: UserIcon },
  { value: "note", label: "Note", icon: MessageSquareIcon },
];

export function CommunicationsTab({ clientId }: CommunicationsTabProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedInteraction, setSelectedInteraction] =
    useState<Interaction | null>(null);
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
    } catch (_error) {
      toast.error("Failed to load communications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

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
      resetForm();
      fetchInteractions();
    } catch (error) {
      toast.error("Failed to log interaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInteraction) {
      return;
    }

    setSubmitting(true);
    try {
      await updateClientInteraction(clientId, selectedInteraction.id, {
        interactionType: formData.interactionType,
        subject: formData.subject || undefined,
        description: formData.description || undefined,
        followUpDate: formData.followUpDate || undefined,
      });
      toast.success("Interaction updated successfully");
      setEditDialogOpen(false);
      setSelectedInteraction(null);
      resetForm();
      fetchInteractions();
    } catch (error) {
      toast.error("Failed to update interaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInteraction) {
      return;
    }

    setSubmitting(true);
    try {
      await deleteClientInteraction(clientId, selectedInteraction.id);
      toast.success("Interaction deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedInteraction(null);
      fetchInteractions();
    } catch (error) {
      toast.error("Failed to delete interaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkFollowUpComplete = async (interaction: Interaction) => {
    try {
      await updateClientInteraction(clientId, interaction.id, {
        followUpCompleted: true,
      });
      toast.success("Follow-up marked as complete");
      fetchInteractions();
    } catch (error) {
      toast.error("Failed to update follow-up status", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const openEditDialog = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setFormData({
      interactionType: interaction.interactionType,
      subject: interaction.subject || "",
      description: interaction.description || "",
      followUpDate: interaction.followUpDate
        ? new Date(interaction.followUpDate).toISOString().split("T")[0]
        : "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      interactionType: "note",
      subject: "",
      description: "",
      followUpDate: "",
    });
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
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0">
                    {getInteractionIcon(interaction.interactionType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
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
                      <div className="flex items-center gap-1">
                        <Button
                          className="h-8 w-8"
                          onClick={() => openEditDialog(interaction)}
                          size="icon"
                          variant="ghost"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(interaction)}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
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
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          Follow-up:{" "}
                          {new Date(
                            interaction.followUpDate
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {!interaction.followUpCompleted && (
                            <Badge className="ml-2 text-xs" variant="secondary">
                              Pending
                            </Badge>
                          )}
                        </div>
                        {!interaction.followUpCompleted && (
                          <Button
                            className="h-7 text-xs"
                            onClick={() =>
                              handleMarkFollowUpComplete(interaction)
                            }
                            size="sm"
                            variant="ghost"
                          >
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Mark Complete
                          </Button>
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

      {/* Edit Dialog */}
      <Dialog onOpenChange={setEditDialogOpen} open={editDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Communication</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="space-y-2">
              <Label htmlFor="edit-interactionType">Type *</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                id="edit-interactionType"
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
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Event planning discussion"
                value={formData.subject}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
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
              <Label htmlFor="edit-followUpDate">Follow-up Date</Label>
              <Input
                id="edit-followUpDate"
                onChange={(e) =>
                  setFormData({ ...formData, followUpDate: e.target.value })
                }
                type="date"
                value={formData.followUpDate}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedInteraction(null);
                  resetForm();
                }}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={submitting} type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Communication?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this communication log entry? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInteraction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
              onClick={handleDelete}
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
