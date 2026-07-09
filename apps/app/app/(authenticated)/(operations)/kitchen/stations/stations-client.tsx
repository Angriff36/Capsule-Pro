"use client";

/**
 * Station catalog — lists governed Station rows and creates via Station.create.
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listFacilities,
  listStations,
} from "@/app/lib/manifest-client.generated";
import type { Facility, Station } from "@/app/lib/manifest-types.generated";
import { createStation } from "./create-station";
import {
  STATION_TYPES,
  stationStatusLabel,
  stationTypeLabel,
} from "./station-catalog";

interface FacilityOption {
  id: string;
  name: string;
}

export function StationsClient() {
  const [stations, setStations] = useState<Station[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [stationType, setStationType] = useState<string>("prep-station");
  const [capacity, setCapacity] = useState("1");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stationPage, facilityPage] = await Promise.all([
        listStations({ limit: 200 }),
        listFacilities({ limit: 200 }),
      ]);
      setStations(stationPage.data);
      setFacilities(
        facilityPage.data.map((facility: Facility) => ({
          id: facility.id,
          name: facility.name || facility.id,
        }))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load stations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const result = await createStation({
        name,
        locationId,
        stationType,
        capacitySimultaneousTasks: Number.parseInt(capacity, 10),
        equipmentList: [],
        notes,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Station “${result.station.name}” created`);
      setName("");
      setNotes("");
      setCapacity("1");
      setStationType("prep-station");
      await load();
    } finally {
      setCreating(false);
    }
  };

  const facilityName = (id: string) =>
    facilities.find((facility) => facility.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium text-lg">Station catalog</h2>
          <p className="text-muted-foreground text-sm">
            Governed Station records — capacity, location, and status from
            Manifest.
          </p>
        </div>
        <Button
          disabled={loading}
          onClick={() => load()}
          size="sm"
          type="button"
          variant="outline"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <Card tone="canvas">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Create station
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label htmlFor="station-name">Name *</Label>
              <Input
                id="station-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Hot line A"
                required
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-location">Location *</Label>
              <Select onValueChange={setLocationId} value={locationId}>
                <SelectTrigger id="station-location">
                  <SelectValue placeholder="Select facility…" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-type">Station type *</Label>
              <Select onValueChange={setStationType} value={stationType}>
                <SelectTrigger id="station-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {stationTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="station-capacity">
                Capacity (simultaneous) *
              </Label>
              <Input
                id="station-capacity"
                min={1}
                onChange={(e) => setCapacity(e.target.value)}
                required
                type="number"
                value={capacity}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="station-notes">Notes</Label>
              <Textarea
                id="station-notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
                value={notes}
              />
            </div>
            <div className="md:col-span-2">
              <Button disabled={creating || !locationId} type="submit">
                {creating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Create station
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="col-span-full" tone="canvas">
            <CardContent className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading stations…
            </CardContent>
          </Card>
        ) : null}
        {!loading && stations.length === 0 ? (
          <Card className="col-span-full" tone="canvas">
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No stations yet. Create the first Station above.
            </CardContent>
          </Card>
        ) : null}
        {loading
          ? null
          : stations.map((station) => (
              <Card key={station.id} tone="canvas">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{station.name}</CardTitle>
                    <Badge variant="outline">
                      {stationStatusLabel(station)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {stationTypeLabel(station.stationType)}
                    </Badge>
                    <Badge variant="outline">
                      Capacity {station.capacitySimultaneousTasks ?? 1}
                    </Badge>
                    <Badge variant="outline">
                      Tasks {station.currentTaskCount ?? 0}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Location: {facilityName(station.locationId)}
                  </p>
                  {station.notes ? (
                    <p className="text-muted-foreground">{station.notes}</p>
                  ) : null}
                  <p className="font-mono text-muted-foreground text-xs">
                    {station.id}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
