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
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
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
  DownloadIcon,
  FileIcon,
  FilterIcon,
  MailIcon,
  MessageSquareIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
  UserIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createClientInteraction,
  deleteClientInteraction,
  getClientInteractions,
  updateClientInteraction,
} from "../../../actions";
import { apiFetch } from "@/app/lib/api";

interface CommunicationsTabProps {
  clientId: string;
}

interface Interaction {
  id: string;
  interactionType: string;
  subject: string | null;
  description: string | null;
  interactionDate: Date;
  followUpDate: Date | null;
  followUpCompleted: boolean;
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

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

  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [interactionAttachments, setInteractionAttachments] = useState<
    Record<string, Attachment[]>
  >({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editPendingFiles, setEditPendingFiles] = useState<File[]>([]);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClientInteractions(clientId, 50, 0, {
        interactionType: filterType !== "all" ? filterType : undefined,
        search: searchQuery || undefined,
      });
      setInteractions(data.data);
    } catch (_error) {
      toast.error("Failed to load communications");
    } finally {
      setLoading(false);
    }
  }, [clientId, filterType, searchQuery]);

  const loadedAttachmentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  useEffect(() => {
    loadedAttachmentIdsRef.current.clear();
  }, [clientId]);

  const fetchAttachments = useCallback(async (interactionIds: string[]) => {
    const results: Record<string, Attachment[]> = {};
    await Promise.all(
      interactionIds.map(async (id) => {
        try {
          const response = await apiFetch(
            `/api/crm/clients/interactions/attachments?interactionId=${id}`
          );
          if (response.ok) {
            const data = await response.json();
            results[id] = data.attachments || [];
          } else {
            results[id] = [];
          }
        } catch {
          results[id] = [];
        }
      })
    );
    setInteractionAttachments((prev) => ({ ...prev, ...results }));
  }, []);

  useEffect(() => {
    if (interactions.length === 0) {
      return;
    }

    const idsToFetch = interactions
      .map((interaction) => interaction.id)
      .filter((id) => !loadedAttachmentIdsRef.current.has(id));

    if (idsToFetch.length === 0) {
      return;
    }

    for (const id of idsToFetch) {
      loadedAttachmentIdsRef.current.add(id);
    }
    void fetchAttachments(idsToFetch);
  }, [interactions, fetchAttachments]);

  const uploadAttachments = async (interactionId: string, files: File[]) => {
    const form = new FormData();
    form.append("interactionId", interactionId);
    for (const file of files) {
      form.append("files", file);
    }
    const response = await apiFetch(
      "/api/crm/clients/interactions/attachments",
      { method: "POST", body: form }
    );
    if (!response.ok) throw new Error("Failed to upload attachments");
    return response.json();
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    try {
      const response = await apiFetch(
        `/api/crm/clients/interactions/attachments?attachmentId=${attachment.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete attachment");
      setInteractionAttachments((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].filter((a) => a.id !== attachment.id);
        }
        return updated;
      });
      toast.success("Attachment deleted");
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const interaction = await createClientInteraction(clientId, {
        interactionType: formData.interactionType,
        subject: formData.subject || undefined,
        description: formData.description || undefined,
        followUpDate: formData.followUpDate || undefined,
      });
      if (pendingFiles.length > 0 && interaction?.id) {
        setUploading(true);
        try {
          await uploadAttachments(interaction.id, pendingFiles);
          toast.success(
            `Interaction logged with ${pendingFiles.length} attachment(s)`
          );
        } catch {
          toast.success("Interaction logged, but attachment upload failed");
        }
        setPendingFiles([]);
        setUploading(false);
      } else {
        toast.success("Interaction logged successfully");
      }
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
    if (!selectedInteraction) return;

    setSubmitting(true);
    try {
      await updateClientInteraction(clientId, selectedInteraction.id, {
        interactionType: formData.interactionType,
        subject: formData.subject || undefined,
        description: formData.description || undefined,
        followUpDate: formData.followUpDate || undefined,
      });
      if (editPendingFiles.length > 0) {
        setUploading(true);
        try {
          await uploadAttachments(selectedInteraction.id, editPendingFiles);
        } catch {
          toast.error("Failed to upload new attachments");
        }
        setUploading(false);
      }
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
    if (!selectedInteraction) return;

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
    setPendingFiles([]);
    setEditPendingFiles([]);
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
        <h2 className="font-semibold text-xl">
          Communication History ({interactions.length})
        </h2>
        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
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
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
                <DatePicker
                  id="followUpDate"
                  onChange={(e) =>
                    setFormData({ ...formData, followUpDate: e.target.value })
                  }
                  value={formData.followUpDate}
                />
              </div>
              <div className="space-y-2">
                <Label>Attachments</Label>
                <input
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.txt,.csv,.xls,.xlsx"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPendingFiles((prev) => [...prev, ...files]);
                    e.target.value = "";
                  }}
                  ref={fileInputRef}
                  type="file"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Add Files
                </Button>
                {pendingFiles.length > 0 && (
                  <div className="space-y-1">
                    {pendingFiles.map((file, i) => (
                      <div
                        className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
                        key={`${file.name}-${i}`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileIcon className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <Button
                          className="h-6 w-6"
                          onClick={() =>
                            setPendingFiles((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            <Button
              className="h-7 text-xs"
              onClick={() => setFilterType("all")}
              size="sm"
              variant={filterType === "all" ? "default" : "outline"}
            >
              All
            </Button>
            {INTERACTION_TYPES.map((type) => (
              <Button
                className="h-7 text-xs"
                key={type.value}
                onClick={() => setFilterType(type.value)}
                size="sm"
                variant={filterType === type.value ? "default" : "outline"}
              >
                <type.icon className="mr-1 h-3 w-3" />
                {type.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="relative max-w-xs flex-1">
          <SearchIcon className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subject or description..."
            value={searchQuery}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          Loading communications...
        </div>
      ) : interactions.length === 0 ? (
        <Card tone="canvas">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquareIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold text-lg">
              {filterType !== "all" || searchQuery
                ? "No matching communications"
                : "No communications yet"}
            </h3>
            <p className="mb-4 text-muted-foreground">
              {filterType !== "all" || searchQuery
                ? "Try adjusting your filters or search terms."
                : "Log your first interaction with this client to start tracking your communication history."}
            </p>
            {filterType === "all" && !searchQuery && (
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Log First Interaction
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <Card key={interaction.id} tone="canvas">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    {getInteractionIcon(interaction.interactionType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
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
                      <div className="mb-1 font-medium text-sm">
                        {interaction.subject}
                      </div>
                    )}
                    {interaction.description && (
                      <p className="whitespace-pre-line text-muted-foreground text-sm">
                        {interaction.description}
                      </p>
                    )}
                    {interactionAttachments[interaction.id]?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {interactionAttachments[interaction.id].map(
                          (attachment) => (
                            <div
                              className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
                              key={attachment.id}
                            >
                              <a
                                className="flex items-center gap-2 text-primary hover:underline"
                                href={attachment.fileUrl}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                <FileIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">
                                  {attachment.fileName}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  ({formatFileSize(attachment.fileSize)})
                                </span>
                              </a>
                              <div className="flex items-center gap-1">
                                <a
                                  className="text-muted-foreground hover:text-foreground"
                                  href={attachment.fileUrl}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  <DownloadIcon className="h-3 w-3" />
                                </a>
                                <Button
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    handleDeleteAttachment(attachment)
                                  }
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Trash2Icon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {interaction.followUpDate && (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
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
                            <CheckIcon className="mr-1 h-3 w-3" />
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
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                id="edit-interactionType"
                onChange={(e) =>
                  setFormData({ ...formData, interactionType: e.target.value })
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
              <DatePicker
                id="edit-followUpDate"
                onChange={(e) =>
                  setFormData({ ...formData, followUpDate: e.target.value })
                }
                value={formData.followUpDate}
              />
            </div>
            <div className="space-y-2">
              <Label>Add Attachments</Label>
              <input
                accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.txt,.csv,.xls,.xlsx"
                className="hidden"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setEditPendingFiles((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
                ref={editFileInputRef}
                type="file"
              />
              <Button
                onClick={() => editFileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <UploadIcon className="mr-2 h-4 w-4" />
                Add Files
              </Button>
              {editPendingFiles.length > 0 && (
                <div className="space-y-1">
                  {editPendingFiles.map((file, i) => (
                    <div
                      className="flex items-center justify-between rounded-md border px-2 py-1 text-sm"
                      key={`edit-${file.name}-${i}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <Button
                        className="h-6 w-6"
                        onClick={() =>
                          setEditPendingFiles((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
