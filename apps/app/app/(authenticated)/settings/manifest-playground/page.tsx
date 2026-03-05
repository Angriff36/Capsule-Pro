"use client";

import { ManifestTestPlayground } from "@repo/design-system/components/blocks/manifest-test-playground";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type {
  EntityDetail,
  EntityListItem,
  ExecutionHistoryEntry,
  ExecutionResult,
} from "@repo/types/manifest-editor";
import { AlertCircle, Flame, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ManifestPlaygroundPage = () => {
  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        "/api/settings/manifest-editor/entities/list"
      );
      if (!response.ok) {
        throw new Error("Failed to load entities");
      }
      const data = await response.json();
      setEntities(data.entities || []);
    } catch (err) {
      console.error("Failed to load entities:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to load manifest entities");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadEntityDetail = async (
    entityName: string
  ): Promise<EntityDetail> => {
    const response = await fetch(
      `/api/settings/manifest-editor/entities/${encodeURIComponent(entityName)}`
    );
    if (!response.ok) {
      throw new Error("Failed to load entity details");
    }
    return response.json();
  };

  const handleExecuteCommand = async (
    entityName: string,
    commandName: string,
    testData: Record<string, unknown>,
    options?: { dryRun?: boolean; captureSnapshot?: boolean }
  ): Promise<ExecutionResult> => {
    const response = await fetch("/api/settings/manifest-playground/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityName,
        commandName,
        testData,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Execution failed: ${response.statusText}`);
    }

    return response.json();
  };

  const handleLoadHistory = async (
    entityName?: string
  ): Promise<ExecutionHistoryEntry[]> => {
    const url = new URL(
      "/api/settings/manifest-playground/execute",
      window.location.href
    );
    if (entityName) {
      url.searchParams.set("entity", entityName);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error("Failed to load history");
    }
    const data = await response.json();
    return data.history || [];
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-8 w-8" />
            Manifest Test Playground
          </h1>
          <p className="text-muted-foreground">
            Interactive testing environment for manifest commands with state
            snapshots, guard validation preview, and execution history replay
          </p>
        </div>
        <Button onClick={loadEntities} variant="outline">
          Reload
        </Button>
      </div>

      {/* Info Banner */}
      <Alert variant="default">
        <Shield className="h-4 w-4" />
        <AlertTitle>Interactive Command Testing</AlertTitle>
        <AlertDescription>
          This playground provides a safe environment to test manifest commands.
          Use <strong className="text-foreground">Dry Run</strong> mode to
          validate guards and constraints without executing the command.
          Snapshots capture state for replay and debugging.
        </AlertDescription>
      </Alert>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : entities.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No manifest entities found. Ensure the manifest IR is compiled.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ManifestTestPlayground
          entities={entities}
          onExecuteCommand={handleExecuteCommand}
          onLoadEntityDetail={handleLoadEntityDetail}
          onLoadHistory={handleLoadHistory}
        />
      )}

      {/* Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The Manifest Test Playground allows you to interactively test
            commands defined in the Manifest IR without affecting production
            data.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Entity Selection:</strong> Choose from 81+ entities with
              350+ commands
            </li>
            <li>
              <strong>Dry Run Mode:</strong> Validate guards and constraints
              without state mutations
            </li>
            <li>
              <strong>State Snapshots:</strong> Capture command output for
              replay and regression testing
            </li>
            <li>
              <strong>Execution History:</strong> Review past executions with
              timing metrics and results
            </li>
            <li>
              <strong>Guard Validation:</strong> Preview which guards will
              pass/fail before execution
            </li>
          </ul>
          <p className="text-xs">
            See{" "}
            <Link
              className="text-primary hover:underline"
              href="https://github.com/angriff36/manifest"
              target="_blank"
            >
              Manifest Specification
            </Link>{" "}
            and{" "}
            <Link
              className="text-primary hover:underline"
              href="/docs/spec/semantics.md"
              target="_blank"
            >
              Runtime Semantics
            </Link>{" "}
            for details.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManifestPlaygroundPage;
