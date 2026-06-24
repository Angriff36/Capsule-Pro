"use client";

import { ManifestTestPlayground } from "@repo/design-system/components/blocks/manifest-test-playground";
import type {
  EntityDetail,
  EntityListItem,
  ExecutionResult,
// @boundaries-ignore automatically added by `turbo boundaries --ignore=all`
"@repo/types/manifest-editor";
import { useEffect, useState } from "react";
// NOTE: Keeping apiFetch for custom manifest-editor settings endpoints (no generated client equivalent)
import { apiFetch } from "@/app/lib/api";

async function fetchEntities(): Promise<EntityListItem[]> {
  const res = await apiFetch("/api/settings/manifest-editor/entities/list");
  if (!res.ok) {
    throw new Error(`Failed to load entities (${res.status})`);
  }
  const json = (await res.json()) as { entities: EntityListItem[] };
  return json.entities;
}

async function fetchEntityDetail(entityName: string): Promise<EntityDetail> {
  const res = await apiFetch(
    `/api/settings/manifest-editor/entities/${encodeURIComponent(entityName)}`
  );
  if (!res.ok) {
    throw new Error(`Failed to load entity (${res.status})`);
  }
  const json = (await res.json()) as { entity: EntityDetail };
  return json.entity;
}

export function ManifestPlaygroundClient() {
  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchEntities()
      .then(setEntities)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load entities");
      });
  }, []);

  return (
    <div className="space-y-3">
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <ManifestTestPlayground
        entities={entities}
        executionEnabled={false}
        onExecuteCommand={async (
          entityName,
          commandName,
          testData,
          options
        ) => {
          const result: ExecutionResult = {
            success: false,
            commandName,
            entityName,
            input: testData,
            guards: [],
            constraints: [],
            error:
              options?.dryRun === true
                ? "Dry-run execution is not enabled in this build."
                : "Command execution is not enabled in this build.",
            executionTime: 0,
          };
          return result;
        }}
        onLoadEntityDetail={fetchEntityDetail}
      />
      <p className="text-muted-foreground text-xs">
        This playground currently runs in preview-only mode (no command
        execution).
      </p>
    </div>
  );
}
