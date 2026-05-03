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
import { PencilIcon, PlusIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createClientPreference,
  deleteClientPreference,
  updateClientPreference,
} from "../../../actions";

type PreferenceValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

interface Preference {
  id: string;
  preferenceType: string;
  preferenceKey: string;
  preferenceValue: PreferenceValue;
  notes: string | null;
}

interface PreferencesTabProps {
  client: {
    id: string;
    preferences: Preference[];
  };
}

const PREFERENCE_TYPES = [
  "Dietary",
  "Venue",
  "Service",
  "Communication",
  "Billing",
  "General",
];

export function PreferencesTab({ client }: PreferencesTabProps) {
  const [preferences, setPreferences] = useState<Preference[]>(
    client.preferences
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPreference, setSelectedPreference] =
    useState<Preference | null>(null);

  const [formData, setFormData] = useState({
    preferenceType: "General",
    preferenceKey: "",
    preferenceValue: "",
    notes: "",
  });

  const refreshPreferences = async () => {
    try {
      const { getClientById } = await import("../../../actions");
      const updated = await getClientById(client.id);
      setPreferences(updated.preferences as Preference[]);
    } catch (_error) {
      toast.error("Failed to refresh preferences");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createClientPreference(client.id, {
        preferenceType: formData.preferenceType,
        preferenceKey: formData.preferenceKey,
        preferenceValue: formData.preferenceValue,
        notes: formData.notes || undefined,
      });
      toast.success("Preference added successfully");
      setDialogOpen(false);
      resetForm();
      refreshPreferences();
    } catch (error) {
      toast.error("Failed to add preference", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPreference) return;
    setSubmitting(true);
    try {
      await updateClientPreference(client.id, selectedPreference.id, {
        preferenceType: formData.preferenceType,
        preferenceKey: formData.preferenceKey,
        preferenceValue: formData.preferenceValue,
        notes: formData.notes || undefined,
      });
      toast.success("Preference updated successfully");
      setEditDialogOpen(false);
      setSelectedPreference(null);
      resetForm();
      refreshPreferences();
    } catch (error) {
      toast.error("Failed to update preference", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPreference) return;
    setSubmitting(true);
    try {
      await deleteClientPreference(client.id, selectedPreference.id);
      toast.success("Preference deleted");
      setDeleteDialogOpen(false);
      setSelectedPreference(null);
      refreshPreferences();
    } catch (error) {
      toast.error("Failed to delete preference", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (pref: Preference) => {
    setSelectedPreference(pref);
    setFormData({
      preferenceType: pref.preferenceType,
      preferenceKey: pref.preferenceKey,
      preferenceValue:
        typeof pref.preferenceValue === "object"
          ? JSON.stringify(pref.preferenceValue)
          : String(pref.preferenceValue ?? ""),
      notes: pref.notes || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (pref: Preference) => {
    setSelectedPreference(pref);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      preferenceType: "General",
      preferenceKey: "",
      preferenceValue: "",
      notes: "",
    });
  };

  const formatValue = (value: PreferenceValue): string => {
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const groupedPreferences = preferences.reduce(
    (acc, pref) => {
      const group = acc[pref.preferenceType] || [];
      group.push(pref);
      acc[pref.preferenceType] = group;
      return acc;
    },
    {} as Record<string, Preference[]>
  );

  const preferenceFormFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="preferenceType">Category *</Label>
        <select
          className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          id="preferenceType"
          onChange={(e) =>
            setFormData({ ...formData, preferenceType: e.target.value })
          }
          required
          value={formData.preferenceType}
        >
          {PREFERENCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="preferenceKey">Key *</Label>
        <Input
          id="preferenceKey"
          onChange={(e) =>
            setFormData({ ...formData, preferenceKey: e.target.value })
          }
          placeholder="e.g. dietary_restrictions, preferred_venue"
          required
          value={formData.preferenceKey}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="preferenceValue">Value *</Label>
        <Textarea
          id="preferenceValue"
          onChange={(e) =>
            setFormData({ ...formData, preferenceValue: e.target.value })
          }
          placeholder="e.g. Vegetarian, Hall A"
          required
          rows={2}
          value={formData.preferenceValue}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prefNotes">Notes</Label>
        <Input
          id="prefNotes"
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Optional notes"
          value={formData.notes}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Client Preferences ({preferences.length})
        </h2>
        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Preference
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Preference</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              {preferenceFormFields}
              <DialogFooter className="gap-2">
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
                  Add Preference
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {preferences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TagIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No preferences set</h3>
            <p className="text-muted-foreground mb-4">
              Add preferences to track client-specific requirements and
              settings.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add First Preference
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPreferences).map(([type, prefs]) => (
            <div key={type}>
              <h3 className="text-lg font-medium mb-3 capitalize">{type}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prefs.map((pref) => (
                  <Card key={pref.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary">{pref.preferenceKey}</Badge>
                        <div className="flex gap-1">
                          <Button
                            className="h-7 w-7"
                            onClick={() => openEditDialog(pref)}
                            size="icon"
                            variant="ghost"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(pref)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm font-mono bg-muted p-2 rounded">
                        {formatValue(pref.preferenceValue)}
                      </div>
                      {pref.notes && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {pref.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog onOpenChange={setEditDialogOpen} open={editDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Preference</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEdit}>
            {preferenceFormFields}
            <DialogFooter className="gap-2">
              <Button
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedPreference(null);
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
            <AlertDialogTitle>Delete Preference?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the &ldquo;
              {selectedPreference?.preferenceKey}&rdquo; preference? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPreference(null)}>
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
