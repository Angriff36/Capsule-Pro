"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationsTab = CommunicationsTab;
const alert_dialog_1 = require("@repo/design-system/components/ui/alert-dialog");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../../../actions");
const INTERACTION_TYPES = [
  { value: "email", label: "Email", icon: lucide_react_1.MailIcon },
  { value: "call", label: "Phone Call", icon: lucide_react_1.PhoneIcon },
  { value: "meeting", label: "Meeting", icon: lucide_react_1.UserIcon },
  { value: "note", label: "Note", icon: lucide_react_1.MessageSquareIcon },
];
function CommunicationsTab({ clientId }) {
  const [interactions, setInteractions] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [dialogOpen, setDialogOpen] = (0, react_1.useState)(false);
  const [editDialogOpen, setEditDialogOpen] = (0, react_1.useState)(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
  const [submitting, setSubmitting] = (0, react_1.useState)(false);
  const [selectedInteraction, setSelectedInteraction] = (0, react_1.useState)(
    null
  );
  const [formData, setFormData] = (0, react_1.useState)({
    interactionType: "note",
    subject: "",
    description: "",
    followUpDate: "",
  });
  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const data = await (0, actions_1.getClientInteractions)(clientId);
      setInteractions(data.data);
    } catch (error) {
      sonner_1.toast.error("Failed to load communications");
    } finally {
      setLoading(false);
    }
  };
  (0, react_1.useEffect)(() => {
    fetchInteractions();
  }, [clientId]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await (0, actions_1.createClientInteraction)(clientId, {
        interactionType: formData.interactionType,
        subject: formData.subject || undefined,
        description: formData.description || undefined,
        followUpDate: formData.followUpDate || undefined,
      });
      sonner_1.toast.success("Interaction logged successfully");
      setDialogOpen(false);
      resetForm();
      fetchInteractions();
    } catch (error) {
      sonner_1.toast.error("Failed to log interaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedInteraction) return;
    setSubmitting(true);
    try {
      await (0, actions_1.updateClientInteraction)(
        clientId,
        selectedInteraction.id,
        {
          interactionType: formData.interactionType,
          subject: formData.subject || undefined,
          description: formData.description || undefined,
          followUpDate: formData.followUpDate || undefined,
        }
      );
      sonner_1.toast.success("Interaction updated successfully");
      setEditDialogOpen(false);
      setSelectedInteraction(null);
      resetForm();
      fetchInteractions();
    } catch (error) {
      sonner_1.toast.error("Failed to update interaction", {
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
      await (0, actions_1.deleteClientInteraction)(
        clientId,
        selectedInteraction.id
      );
      sonner_1.toast.success("Interaction deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedInteraction(null);
      fetchInteractions();
    } catch (error) {
      sonner_1.toast.error("Failed to delete interaction", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };
  const handleMarkFollowUpComplete = async (interaction) => {
    try {
      await (0, actions_1.updateClientInteraction)(clientId, interaction.id, {
        followUpCompleted: true,
      });
      sonner_1.toast.success("Follow-up marked as complete");
      fetchInteractions();
    } catch (error) {
      sonner_1.toast.error("Failed to update follow-up status", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  const openEditDialog = (interaction) => {
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
  const openDeleteDialog = (interaction) => {
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
  const getInteractionIcon = (type) => {
    const interaction = INTERACTION_TYPES.find((t) => t.value === type);
    const Icon = interaction?.icon || lucide_react_1.MessageSquareIcon;
    return <Icon className="h-4 w-4" />;
  };
  const getInteractionLabel = (type) => {
    const interaction = INTERACTION_TYPES.find((t) => t.value === type);
    return interaction?.label || type;
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Communication History ({interactions.length})
        </h2>
        <dialog_1.Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <dialog_1.DialogTrigger asChild>
            <button_1.Button>
              <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
              Log Interaction
            </button_1.Button>
          </dialog_1.DialogTrigger>
          <dialog_1.DialogContent>
            <dialog_1.DialogHeader>
              <dialog_1.DialogTitle>Log Communication</dialog_1.DialogTitle>
            </dialog_1.DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label_1.Label htmlFor="interactionType">Type *</label_1.Label>
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
                <label_1.Label htmlFor="subject">Subject</label_1.Label>
                <input_1.Input
                  id="subject"
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="Event planning discussion"
                  value={formData.subject}
                />
              </div>
              <div className="space-y-2">
                <label_1.Label htmlFor="description">Description</label_1.Label>
                <textarea_1.Textarea
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
                <label_1.Label htmlFor="followUpDate">
                  Follow-up Date
                </label_1.Label>
                <input_1.Input
                  id="followUpDate"
                  onChange={(e) =>
                    setFormData({ ...formData, followUpDate: e.target.value })
                  }
                  type="date"
                  value={formData.followUpDate}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button_1.Button
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </button_1.Button>
                <button_1.Button disabled={submitting} type="submit">
                  Log Interaction
                </button_1.Button>
              </div>
            </form>
          </dialog_1.DialogContent>
        </dialog_1.Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading communications...
        </div>
      ) : interactions.length === 0 ? (
        <card_1.Card>
          <card_1.CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <lucide_react_1.MessageSquareIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No communications yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Log your first interaction with this client to start tracking your
              communication history.
            </p>
            <button_1.Button onClick={() => setDialogOpen(true)}>
              <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
              Log First Interaction
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <card_1.Card key={interaction.id}>
              <card_1.CardContent className="py-4">
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
                        <badge_1.Badge className="text-xs" variant="outline">
                          {new Date(
                            interaction.interactionDate
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </badge_1.Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <button_1.Button
                          className="h-8 w-8"
                          onClick={() => openEditDialog(interaction)}
                          size="icon"
                          variant="ghost"
                        >
                          <lucide_react_1.PencilIcon className="h-3.5 w-3.5" />
                        </button_1.Button>
                        <button_1.Button
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(interaction)}
                          size="icon"
                          variant="ghost"
                        >
                          <lucide_react_1.Trash2Icon className="h-3.5 w-3.5" />
                        </button_1.Button>
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
                          <lucide_react_1.CalendarIcon className="h-3 w-3" />
                          Follow-up:{" "}
                          {new Date(
                            interaction.followUpDate
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {!interaction.followUpCompleted && (
                            <badge_1.Badge
                              className="ml-2 text-xs"
                              variant="secondary"
                            >
                              Pending
                            </badge_1.Badge>
                          )}
                        </div>
                        {!interaction.followUpCompleted && (
                          <button_1.Button
                            className="h-7 text-xs"
                            onClick={() =>
                              handleMarkFollowUpComplete(interaction)
                            }
                            size="sm"
                            variant="ghost"
                          >
                            <lucide_react_1.CheckIcon className="h-3 w-3 mr-1" />
                            Mark Complete
                          </button_1.Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <dialog_1.Dialog onOpenChange={setEditDialogOpen} open={editDialogOpen}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Edit Communication</dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-interactionType">
                Type *
              </label_1.Label>
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
              <label_1.Label htmlFor="edit-subject">Subject</label_1.Label>
              <input_1.Input
                id="edit-subject"
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Event planning discussion"
                value={formData.subject}
              />
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-description">
                Description
              </label_1.Label>
              <textarea_1.Textarea
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
              <label_1.Label htmlFor="edit-followUpDate">
                Follow-up Date
              </label_1.Label>
              <input_1.Input
                id="edit-followUpDate"
                onChange={(e) =>
                  setFormData({ ...formData, followUpDate: e.target.value })
                }
                type="date"
                value={formData.followUpDate}
              />
            </div>
            <dialog_1.DialogFooter className="gap-2">
              <button_1.Button
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedInteraction(null);
                  resetForm();
                }}
                type="button"
                variant="outline"
              >
                Cancel
              </button_1.Button>
              <button_1.Button disabled={submitting} type="submit">
                Save Changes
              </button_1.Button>
            </dialog_1.DialogFooter>
          </form>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* Delete Confirmation Dialog */}
      <alert_dialog_1.AlertDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      >
        <alert_dialog_1.AlertDialogContent>
          <alert_dialog_1.AlertDialogHeader>
            <alert_dialog_1.AlertDialogTitle>
              Delete Communication?
            </alert_dialog_1.AlertDialogTitle>
            <alert_dialog_1.AlertDialogDescription>
              Are you sure you want to delete this communication log entry? This
              action cannot be undone.
            </alert_dialog_1.AlertDialogDescription>
          </alert_dialog_1.AlertDialogHeader>
          <alert_dialog_1.AlertDialogFooter>
            <alert_dialog_1.AlertDialogCancel
              onClick={() => setSelectedInteraction(null)}
            >
              Cancel
            </alert_dialog_1.AlertDialogCancel>
            <alert_dialog_1.AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={submitting}
              onClick={handleDelete}
            >
              {submitting ? "Deleting..." : "Delete"}
            </alert_dialog_1.AlertDialogAction>
          </alert_dialog_1.AlertDialogFooter>
        </alert_dialog_1.AlertDialogContent>
      </alert_dialog_1.AlertDialog>
    </div>
  );
}
