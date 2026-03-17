"use client";

import { Card } from "@repo/design-system/components/ui/card";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type { EntityDetail, EntityListItem } from "@repo/types/manifest-editor";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const ManifestPolicyEditor = dynamic(
  () =>
    import("@repo/design-system/components/blocks/manifest-policy-editor").then(
      (module) => module.ManifestPolicyEditor
    ),
  { ssr: false, loading: () => <Skeleton className="h-[600px] w-full" /> }
);

async function fetchEntities(): Promise<EntityListItem[]> {
  const res = await fetch("/api/settings/manifest-editor/entities/list");
  if (!res.ok) {
    throw new Error(`Failed to load entities (${res.status})`);
  }
  const json = (await res.json()) as { entities: EntityListItem[] };
  return json.entities;
}

async function fetchEntityDetail(entityName: string): Promise<EntityDetail> {
  const res = await fetch(
    `/api/settings/manifest-editor/entities/${encodeURIComponent(entityName)}`
  );
  if (!res.ok) {
    throw new Error(`Failed to load entity (${res.status})`);
  }
  const json = (await res.json()) as { entity: EntityDetail };
  return json.entity;
}

export function ManifestEditorClient() {
  const [entities, setEntities] = useState<EntityListItem[] | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
  const [error, setError] = useState<string>("");

  const sortedEntities = useMemo(
    () => (entities ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [entities]
  );

  useEffect(() => {
    fetchEntities()
      .then((list) => {
        setEntities(list);
        if (list.length > 0) {
          setSelectedEntity(list[0].name);
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load entities");
      });
  }, []);

  useEffect(() => {
    if (!selectedEntity) {
      setEntityDetail(null);
      return;
    }

    setError("");
    setEntityDetail(null);
    fetchEntityDetail(selectedEntity)
      .then(setEntityDetail)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load entity");
      });
  }, [selectedEntity]);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-2">
          <Label>Business object</Label>
          {entities ? (
            <Select onValueChange={setSelectedEntity} value={selectedEntity}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a business object" />
              </SelectTrigger>
              <SelectContent>
                {sortedEntities.map((e) => (
                  <SelectItem key={e.name} value={e.name}>
                    {e.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Skeleton className="h-10 w-full" />
          )}
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          Read-only explorer backed by compiled Manifest IR. Some details (like
          parameters, checks, and permission rules) are not surfaced in this IR
          build yet.
        </p>
      </Card>

      {entityDetail ? (
        <ManifestPolicyEditor entity={entityDetail} />
      ) : (
        <Skeleton className="h-[600px] w-full" />
      )}
    </div>
  );
}
