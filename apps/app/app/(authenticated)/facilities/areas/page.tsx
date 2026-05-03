"use client";

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
import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { createFacilityArea } from "../../actions";
import { FacilitiesNavigation } from "../components/facilities-navigation";

export default function AreasPage() {
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
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
      const res = await apiFetch("/api/facilities/areas/list?status=all");
      const data = await res.json();
      if (data.success) setAreas(data.data.areas || []);
    } catch (error) {
      console.error("Failed to load areas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      await createFacilityArea({
        name: createForm.name,
        code: createForm.code || undefined,
        areaType: createForm.areaType,
        floor: createForm.floor || undefined,
        squareFootage: createForm.squareFeet
          ? Number.parseInt(createForm.squareFeet)
          : undefined,
        notes: createForm.description || undefined,
      });
      await loadAreas();
      setShowCreateDialog(false);
      setCreateForm({
        name: "",
        code: "",
        areaType: "other",
        floor: "",
        squareFeet: "",
        description: "",
      });
    } catch (error) {
      console.error("Failed to create area:", error);
    } finally {
      setCreating(false);
    }
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

  const totalSqFt = areas.reduce((sum, a) => sum + (a.square_feet || 0), 0);

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

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold tracking-tight">
              Facility Areas
            </h1>
            <p className="text-muted-foreground">
              Define and manage areas within your facility.
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Area
          </Button>
        </div>

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
            <CardContent className="py-8 text-center text-muted-foreground">
              No facility areas found. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <Card key={area.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {areaTypeIcons[area.area_type] || "🏢"}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{area.name}</div>
                      {area.code && (
                        <div className="text-sm text-muted-foreground">
                          {area.code}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge className="capitalize" variant="outline">
                          {area.area_type?.replace("_", " ")}
                        </Badge>
                        {area.square_feet && (
                          <span className="text-xs text-muted-foreground">
                            {area.square_feet} sq ft
                          </span>
                        )}
                        {area.floor && (
                          <span className="text-xs text-muted-foreground">
                            Floor: {area.floor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Area Dialog */}
        <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Facility Area</DialogTitle>
              <DialogDescription>
                Define a new area within your facility.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="areaName">Area Name *</Label>
                  <Input
                    id="areaName"
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g., Main Kitchen"
                    required
                    value={createForm.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaCode">Code</Label>
                  <Input
                    id="areaCode"
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, code: e.target.value }))
                    }
                    placeholder="e.g., KIT-01"
                    value={createForm.code}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Area Type</Label>
                  <Select
                    onValueChange={(v) =>
                      setCreateForm((p) => ({ ...p, areaType: v }))
                    }
                    value={createForm.areaType}
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
                      setCreateForm((p) => ({ ...p, floor: e.target.value }))
                    }
                    placeholder="e.g., 1st Floor"
                    value={createForm.floor}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaSqft">Square Feet</Label>
                <Input
                  id="areaSqft"
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, squareFeet: e.target.value }))
                  }
                  placeholder="0"
                  type="number"
                  value={createForm.squareFeet}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Area description..."
                  rows={2}
                  value={createForm.description}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={!createForm.name.trim() || creating}
                  type="submit"
                >
                  {creating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Area
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
