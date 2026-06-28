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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
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
import { LayoutGrid, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  facilityAreaEdit,
  facilityAreaRemove,
  listFacilityAreas,
} from "@/app/lib/manifest-client.generated";
import { createFacilityArea } from "../actions";
import { OperationalPageShell } from "../../components/operational-page-shell";
import { FacilitiesNavigation } from "../components/facilities-navigation";

export default function AreasPage() {
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    areaType: "other",
    floor: "",
    squareFeet: "",
    description: "",
  });

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const result = await listFacilityAreas({ status: "all" });
      setAreas(result.data || []);
    } catch (error) {
      console.error("Failed to load areas:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      areaType: "other",
      floor: "",
      squareFeet: "",
      description: "",
    });
    setShowDialog(true);
  };

  const openEdit = (area: any) => {
    setEditing(area);
    setForm({
      name: area.name,
      code: area.code || "",
      areaType: area.areaType ?? "other",
      floor: area.floor || "",
      squareFeet: area.squareFeet?.toString() || "",
      description: area.description || "",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await facilityAreaEdit({
          id: editing.id,
          name: form.name,
          code: form.code || undefined,
          areaType: form.areaType,
          floor: form.floor || undefined,
          squareFeet: form.squareFeet
            ? Number.parseInt(form.squareFeet, 10)
            : undefined,
          description: form.description || undefined,
        });
        await loadAreas();
        setShowDialog(false);
      } else {
        await createFacilityArea({
          name: form.name,
          code: form.code || undefined,
          areaType: form.areaType,
          floor: form.floor || undefined,
          squareFeet: form.squareFeet
            ? Number.parseInt(form.squareFeet, 10)
            : undefined,
          description: form.description || undefined,
        });
        await loadAreas();
        setShowDialog(false);
      }
    } catch (error) {
      console.error("Failed to save area:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (areaId: string) => {
    setDeleting(areaId);
    try {
      await facilityAreaRemove({ id: areaId });
      setAreas((prev) => prev.filter((a) => a.id !== areaId));
      setDeleteDialogOpen(false);
      setAreaToDelete(null);
    } catch (error) {
      console.error("Failed to delete area:", error);
    } finally {
      setDeleting(null);
    }
  };

  const confirmDelete = (area: any) => {
    setAreaToDelete({ id: area.id, name: area.name });
    setDeleteDialogOpen(true);
  };

  const areaTypeIcons: Record<string, string> = {
    kitchen: "🍳",
    prep: "🔪",
    storage: "📦",
    dining: "🍽️",
    office: "💼",
    loading_dock: "🚚",
    restroom: "🚻",
    other: "🏢",
  };

  const totalSqFt = areas.reduce((sum, a) => sum + (a.squareFeet || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FacilitiesNavigation />

      <OperationalPageShell
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Area
          </Button>
        }
        description="Define and manage areas within your facility."
        eyebrow="Facilities / Areas"
        title="Facility areas"
      >

        <div className="flex gap-2">
          <Badge variant="secondary">{areas.length} Areas</Badge>
          {totalSqFt > 0 && (
            <Badge variant="outline">
              {totalSqFt.toLocaleString()} sq ft total
            </Badge>
          )}
        </div>

        {areas.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <LayoutGrid />
                  </EmptyMedia>
                  <EmptyTitle>No facility areas yet</EmptyTitle>
                  <EmptyDescription>
                    Define areas within your facility — kitchens, storage rooms,
                    dining halls, and more — to organize operations.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={openCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first area
                  </Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <Card key={area.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {areaTypeIcons[area.areaType ?? "other"] || "🏢"}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{area.name}</div>
                      {area.code && (
                        <div className="text-muted-foreground text-sm">
                          {area.code}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="capitalize" variant="outline">
                          {area.areaType?.replace("_", " ")}
                        </Badge>
                        {area.squareFeet && (
                          <span className="text-muted-foreground text-xs">
                            {area.squareFeet} sq ft
                          </span>
                        )}
                        {area.floor && (
                          <span className="text-muted-foreground text-xs">
                            Floor: {area.floor}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => openEdit(area)}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        className="text-red-500 hover:text-red-700"
                        disabled={deleting === area.id}
                        onClick={() => confirmDelete(area)}
                        size="sm"
                        variant="ghost"
                      >
                        {deleting === area.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </OperationalPageShell>

        {/* Create/Edit Area Dialog */}
        <Dialog onOpenChange={setShowDialog} open={showDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Area" : "Add Facility Area"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update area information."
                  : "Define a new area within your facility."}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="areaName">Area Name *</Label>
                  <Input
                    id="areaName"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g., Main Kitchen"
                    required
                    value={form.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaCode">Code</Label>
                  <Input
                    id="areaCode"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, code: e.target.value }))
                    }
                    placeholder="e.g., KIT-01"
                    value={form.code}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Area Type</Label>
                  <Select
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, areaType: v }))
                    }
                    value={form.areaType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="prep">Prep Area</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="dining">Dining</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="loading_dock">Loading Dock</SelectItem>
                      <SelectItem value="restroom">Restroom</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaFloor">Floor</Label>
                  <Input
                    id="areaFloor"
                    onChange={(e) =>
                      setForm((p) => ({ ...p, floor: e.target.value }))
                    }
                    placeholder="e.g., 1st Floor"
                    value={form.floor}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaSqft">Square Feet</Label>
                <Input
                  id="areaSqft"
                  onChange={(e) =>
                    setForm((p) => ({ ...p, squareFeet: e.target.value }))
                  }
                  placeholder="0"
                  type="number"
                  value={form.squareFeet}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Area description..."
                  rows={2}
                  value={form.description}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setShowDialog(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={!form.name.trim() || saving} type="submit">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Update" : "Add"} Area
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setAreaToDelete(null);
            }
          }}
          open={deleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Area</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {areaToDelete?.name || "this area"}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={deleting === areaToDelete?.id}
                onClick={() => {
                  if (areaToDelete) {
                    handleDelete(areaToDelete.id);
                  }
                }}
              >
                {deleting === areaToDelete?.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
