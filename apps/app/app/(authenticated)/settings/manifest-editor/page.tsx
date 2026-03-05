"use client";

import { ManifestPolicyEditor } from "@repo/design-system/components/blocks/manifest-policy-editor";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type {
  EntityDetail,
  EntityListItem,
  ValidationResult,
} from "@repo/types/manifest-editor";
import { AlertCircle, FileJson, RefreshCw, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ManifestEditorPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityParam = searchParams.get("entity");

  const [entities, setEntities] = useState<EntityListItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(
    entityParam || null
  );
  const [entityDetail, setEntityDetail] = useState<EntityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    if (selectedEntity) {
      loadEntityDetail(selectedEntity);
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set("entity", selectedEntity);
      window.history.replaceState({}, "", url.toString());
    } else {
      setEntityDetail(null);
    }
  }, [selectedEntity]);

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

      // Auto-select first entity if none selected
      if (!selectedEntity && data.entities?.length > 0) {
        setSelectedEntity(data.entities[0].name);
      }
    } catch (err) {
      console.error("Failed to load entities:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to load manifest entities");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEntityDetail = async (entityName: string) => {
    try {
      setIsLoadingDetail(true);
      setError(null);
      const response = await fetch(
        `/api/settings/manifest-editor/entities/${encodeURIComponent(entityName)}`
      );
      if (!response.ok) {
        throw new Error("Failed to load entity details");
      }
      const data = await response.json();
      setEntityDetail(data);
    } catch (err) {
      console.error("Failed to load entity detail:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error(`Failed to load ${entityName} details`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleValidateExpression = async (
    type: "guard" | "constraint" | "policy",
    expression: string
  ): Promise<boolean> => {
    if (!entityDetail) return false;

    try {
      const response = await fetch("/api/settings/manifest-editor/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityName: entityDetail.name,
          type,
          expression,
          testData: {
            // Provide sample test data based on entity properties
            id: "test-id",
            tenantId: "test-tenant",
            status: "active",
            createdAt: Date.now(),
          },
        }),
      });

      const result = (await response.json()) as ValidationResult;

      if (result.valid && result.passed) {
        toast.success("Expression validated successfully");
        return true;
      }
      toast.error(result.error || "Validation failed");
      return false;
    } catch (err) {
      console.error("Validation error:", err);
      toast.error("Validation request failed");
      return false;
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Manifest Policy Editor
          </h1>
          <p className="text-muted-foreground">
            Visualize and edit Manifest policies, guards, and constraints
          </p>
        </div>
        <Button onClick={loadEntities} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload
        </Button>
      </div>

      {/* Info Banner */}
      <Alert variant="default">
        <FileJson className="h-4 w-4" />
        <AlertTitle>Manifest Language Integration</AlertTitle>
        <AlertDescription>
          This editor displays compiled Manifest IR from{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-sm">
            @repo/manifest-ir
          </code>
          . All domain behaviors are defined in{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-sm">
            .manifest
          </code>{" "}
          files and compiled to IR at build time. This is a read-only viewer for
          understanding the current domain rules.
        </AlertDescription>
      </Alert>

      {/* Entity Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Entity</CardTitle>
          <CardDescription>
            Choose an entity to view its commands, constraints, guards, and
            policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              disabled={entities.length === 0}
              onValueChange={(value) => setSelectedEntity(value)}
              value={selectedEntity || undefined}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an entity..." />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity.name} value={entity.name}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{entity.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {entity.commands.length} cmd •{" "}
                        {entity.constraints.length} cons
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Entity Detail */}
      {isLoadingDetail ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : entityDetail ? (
        <ManifestPolicyEditor
          entity={entityDetail}
          onValidateExpression={handleValidateExpression}
        />
      ) : selectedEntity ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Loading {selectedEntity} details...
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Select an entity above to view its manifest details
            </p>
          </CardContent>
        </Card>
      )}

      {/* Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The Manifest Language defines all domain semantics for Capsule-Pro.
            See the documentation for:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <Link
                className="text-primary hover:underline"
                href="https://github.com/angriff36/manifest"
                target="_blank"
              >
                Manifest Specification
              </Link>
            </li>
            <li>
              <Link
                className="text-primary hover:underline"
                href="/docs/spec/semantics.md"
                target="_blank"
              >
                Runtime Semantics
              </Link>
            </li>
            <li>
              <Link
                className="text-primary hover:underline"
                href="/docs/spec/conformance.md"
                target="_blank"
              >
                Conformance Rules
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManifestEditorPage;
