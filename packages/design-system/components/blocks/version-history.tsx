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
} from "@repo/design-system/ui/alert-dialog";
import { Badge } from "@repo/design-system/ui/badge";
import { Button } from "@repo/design-system/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/ui/card";
import { ScrollArea } from "@repo/design-system/ui/scroll-area";
import { Separator } from "@repo/design-system/ui/separator";
import { Skeleton } from "@repo/design-system/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  Clock,
  GitBranch,
  Lock,
  RotateCcw,
  Unlock,
} from "lucide-react";
import * as React from "react";

// Types for the version control system
export interface EntityVersion {
  id: string;
  versionNumber: number;
  changeReason: string | null;
  changeSummary: string | null;
  changeType: "create" | "update" | "restore" | "approve" | "auto";
  isApproved: boolean;
  createdAt: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface VersionedEntity {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  isLocked: boolean;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VersionHistoryProps {
  versionedEntity: VersionedEntity;
  versions: EntityVersion[];
  isLoading?: boolean;
  onVersionRestore?: (
    versionId: string,
    changeReason?: string
  ) => Promise<void>;
  onVersionApprove?: (versionId: string) => Promise<void>;
  onLockToggle?: (entityId: string, lock: boolean) => Promise<void>;
  onCompareVersions?: (versionA: string, versionB: string) => void;
  currentUserCanEdit?: boolean;
  currentUserCanApprove?: boolean;
}

const changeTypeColors: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  create: { variant: "default", label: "Created" },
  update: { variant: "secondary", label: "Updated" },
  restore: { variant: "outline", label: "Restored" },
  approve: { variant: "default", label: "Approved" },
  auto: { variant: "secondary", label: "Auto-saved" },
};

export function VersionHistory({
  versionedEntity,
  versions,
  isLoading = false,
  onVersionRestore,
  onVersionApprove,
  onLockToggle,
  onCompareVersions,
  currentUserCanEdit = false,
  currentUserCanApprove = false,
}: VersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = React.useState<string[]>([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false);
  const [pendingRestoreVersion, setPendingRestoreVersion] = React.useState<
    string | null
  >(null);
  const [restoring, setRestoring] = React.useState(false);
  const [approving, setApproving] = React.useState<Record<string, boolean>>({});
  const [togglingLock, setTogglingLock] = React.useState(false);

  const handleRestoreClick = (versionId: string) => {
    setPendingRestoreVersion(versionId);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!(pendingRestoreVersion && onVersionRestore)) return;

    setRestoring(true);
    try {
      await onVersionRestore(
        pendingRestoreVersion,
        "Restored via version history"
      );
      setRestoreDialogOpen(false);
      setPendingRestoreVersion(null);
    } finally {
      setRestoring(false);
    }
  };

  const handleApprove = async (versionId: string) => {
    if (!onVersionApprove) return;

    setApproving((prev) => ({ ...prev, [versionId]: true }));
    try {
      await onVersionApprove(versionId);
    } finally {
      setApproving((prev) => ({ ...prev, [versionId]: false }));
    }
  };

  const handleLockToggle = async () => {
    if (!onLockToggle) return;

    setTogglingLock(true);
    try {
      await onLockToggle(versionedEntity.id, !versionedEntity.isLocked);
    } finally {
      setTogglingLock(false);
    }
  };

  const handleCompareClick = () => {
    if (selectedVersions.length === 2 && onCompareVersions) {
      onCompareVersions(selectedVersions[0], selectedVersions[1]);
    }
  };

  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter((id) => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Version History
            </CardTitle>
            <CardDescription>
              {versionedEntity.entityName} ({versionedEntity.entityType})
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedVersions.length === 2 && onCompareVersions && (
              <Button onClick={handleCompareClick} size="sm" variant="outline">
                Compare Selected
              </Button>
            )}
            {currentUserCanEdit && onLockToggle && (
              <Button
                disabled={togglingLock}
                onClick={handleLockToggle}
                size="sm"
                variant="outline"
              >
                {versionedEntity.isLocked ? (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Lock
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div className="flex items-center gap-4" key={i}>
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No versions found for this entity.</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {versions.map((version, index) => (
                <React.Fragment key={version.id}>
                  <div
                    className={`flex gap-4 p-3 rounded-lg border transition-colors ${
                      selectedVersions.includes(version.id)
                        ? "bg-accent border-accent"
                        : "bg-card hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <button
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          selectedVersions.includes(version.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted-foreground/20"
                        }`}
                        onClick={() => toggleVersionSelection(version.id)}
                      >
                        {version.versionNumber}
                      </button>
                      {index < versions.length - 1 && (
                        <div className="w-0.5 h-full bg-border min-h-[2rem]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={
                              changeTypeColors[version.changeType]?.variant ||
                              "secondary"
                            }
                          >
                            {changeTypeColors[version.changeType]?.label ||
                              version.changeType}
                          </Badge>
                          {version.isApproved && (
                            <Badge className="gap-1" variant="outline">
                              <CheckCircle className="h-3 w-3" />
                              Approved
                            </Badge>
                          )}
                          {index === 0 && (
                            <Badge variant="default">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {currentUserCanEdit &&
                            onVersionRestore &&
                            index > 0 &&
                            !versionedEntity.isLocked && (
                              <Button
                                disabled={restoring}
                                onClick={() => handleRestoreClick(version.id)}
                                size="sm"
                                variant="ghost"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          {currentUserCanApprove &&
                            onVersionApprove &&
                            !version.isApproved && (
                              <Button
                                disabled={approving[version.id]}
                                onClick={() => handleApprove(version.id)}
                                size="sm"
                                variant="ghost"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                      </div>

                      {version.changeReason && (
                        <p className="text-sm font-medium">
                          {version.changeReason}
                        </p>
                      )}
                      {version.changeSummary && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {version.changeSummary}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <span>by {version.createdBy}</span>
                        {version.approvedBy && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            by {version.approvedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < versions.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <AlertDialog onOpenChange={setRestoreDialogOpen} open={restoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restore Version #
              {pendingRestoreVersion &&
                versions.find((v) => v.id === pendingRestoreVersion)
                  ?.versionNumber}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this version? This will create a
              new version with the same data as the selected version. Any
              changes made after this version will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={handleRestoreConfirm}
            >
              {restoring ? "Restoring..." : "Restore Version"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Version comparison dialog component
export interface VersionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionA: EntityVersion | null;
  versionB: EntityVersion | null;
}

export function VersionCompareDialog({
  open,
  onOpenChange,
  versionA,
  versionB,
}: VersionCompareDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-w-4xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Compare Versions</AlertDialogTitle>
          <AlertDialogDescription>
            Comparing Version {versionA?.versionNumber} vs Version{" "}
            {versionB?.versionNumber}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">
              Version {versionA?.versionNumber}
            </h4>
            {versionA && (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  {versionA.changeReason || "No reason provided"}
                </p>
                <p className="text-xs">
                  {formatDistanceToNow(new Date(versionA.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            )}
          </div>
          <div>
            <h4 className="font-medium mb-2">
              Version {versionB?.versionNumber}
            </h4>
            {versionB && (
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  {versionB.changeReason || "No reason provided"}
                </p>
                <p className="text-xs">
                  {formatDistanceToNow(new Date(versionB.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for fetching version history
export function useVersionHistory(versionedEntityId: string | null) {
  const [versions, setVersions] = React.useState<EntityVersion[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!versionedEntityId) {
      setVersions([]);
      return;
    }

    setIsLoading(true);
    fetch(
      `/api/version-control/versions/list?versionedEntityId=${versionedEntityId}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        setVersions(data.versions || []);
      })
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [versionedEntityId]);

  return { versions, isLoading, error, refetch: () => {} };
}
