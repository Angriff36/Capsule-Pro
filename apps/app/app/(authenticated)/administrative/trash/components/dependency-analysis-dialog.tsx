"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronRightIcon,
  InfoIcon,
  LoaderIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import type { DependencyAnalysis } from "./trash-page-client";

interface TrashItem {
  id: string;
  entity: string;
  displayName: string;
  deletedAt: string;
  hasDependents: boolean;
  tenantId: string;
}

interface DependencyAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TrashItem | null;
  analysis: DependencyAnalysis | null;
  loading: boolean;
  onRestore: (cascade: boolean) => void;
}

export function DependencyAnalysisDialog({
  open,
  onOpenChange,
  item,
  analysis,
  loading,
  onRestore,
}: DependencyAnalysisDialogProps) {
  if (!item) return null;

  const getRecommendedActionBadge = () => {
    if (!analysis) return null;

    switch (analysis.summary.recommendedAction) {
      case "restore":
        return (
          <Badge className="gap-1 bg-green-100 text-green-800">
            <CheckIcon className="size-3" />
            Safe to Restore
          </Badge>
        );
      case "cascade_restore":
        return (
          <Badge className="gap-1 bg-blue-100 text-blue-800">
            <InfoIcon className="size-3" />
            Cascade Restore Recommended
          </Badge>
        );
      case "cannot_restore":
        return (
          <Badge className="gap-1 bg-red-100 text-red-800">
            <AlertTriangleIcon className="size-3" />
            Cannot Restore
          </Badge>
        );
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle>Restore Analysis</DialogTitle>
              {getRecommendedActionBadge()}
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              size="icon"
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          <DialogDescription>
            Review dependencies before restoring "{item.displayName}"
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <LoaderIcon className="size-8 animate-spin" />
              <p>Analyzing dependencies...</p>
            </div>
          </div>
        ) : analysis ? (
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <Tabs className="w-full" defaultValue="summary">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="dependents">
                  Dependents ({analysis.summary.totalDependents})
                </TabsTrigger>
                {analysis.restorePlan && (
                  <TabsTrigger value="plan">Restore Plan</TabsTrigger>
                )}
              </TabsList>

              <TabsContent className="space-y-4 mt-4" value="summary">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Total Dependents
                    </div>
                    <div className="text-2xl font-bold">
                      {analysis.summary.totalDependents}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Deleted Dependents
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {analysis.summary.deletedDependents}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Active Dependents
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {analysis.summary.activeDependents}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Restore Status
                    </div>
                    <div className="text-2xl font-bold">
                      {analysis.summary.canRestore ? (
                        <span className="text-green-600">Allowed</span>
                      ) : (
                        <span className="text-red-600">Blocked</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warnings */}
                {analysis.restorePlan?.warnings &&
                  analysis.restorePlan.warnings.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangleIcon className="size-5 text-orange-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-orange-900">
                            Warning
                          </h4>
                          <ul className="mt-2 space-y-1 text-sm text-orange-800">
                            {analysis.restorePlan.warnings.map((warning, i) => (
                              <li key={i}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Recommendation */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Recommendation</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysis.summary.recommendedAction === "restore" &&
                      "This entity can be safely restored. No active dependents that would cause issues."}
                    {analysis.summary.recommendedAction === "cascade_restore" &&
                      "This entity has deleted dependents. Consider cascade restore to recover all related data."}
                    {analysis.summary.recommendedAction === "cannot_restore" &&
                      "This entity has active required dependents that prevent safe restoration."}
                  </p>
                </div>
              </TabsContent>

              <TabsContent className="space-y-2 mt-4" value="dependents">
                {analysis.dependents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No dependent entities found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analysis.dependents.map((dep) => (
                      <div
                        className={`flex items-center justify-between border rounded-lg p-3 ${
                          dep.node.isDeleted
                            ? "bg-orange-50 border-orange-200"
                            : "bg-blue-50 border-blue-200"
                        }`}
                        key={dep.node.id}
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {dep.node.displayName}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>{dep.node.entity}</span>
                              <span>via {dep.edge.description}</span>
                              <Badge className="text-xs" variant="outline">
                                {dep.edge.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Badge
                          className={dep.node.isDeleted ? "bg-orange-100" : ""}
                          variant={dep.node.isDeleted ? "secondary" : "default"}
                        >
                          {dep.node.isDeleted ? "Deleted" : "Active"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {analysis.restorePlan && (
                <TabsContent className="space-y-2 mt-4" value="plan">
                  <div className="text-sm text-muted-foreground mb-4">
                    The following steps will be executed during restore:
                  </div>
                  {analysis.restorePlan.steps.map((step, i) => (
                    <div
                      className="flex items-start gap-3 border rounded-lg p-3"
                      key={step.entityId}
                    >
                      <div className="flex items-center justify-center size-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{step.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {step.entityType} • {step.reason}
                        </div>
                      </div>
                      <Badge
                        variant={
                          step.action === "restore" ? "default" : "secondary"
                        }
                      >
                        {step.action}
                      </Badge>
                    </div>
                  ))}
                </TabsContent>
              )}
            </Tabs>
          </div>
        ) : null}

        <DialogFooter className="border-t pt-4">
          <Button
            disabled={loading}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          {analysis && analysis.summary.canRestore && (
            <>
              <Button
                disabled={loading}
                onClick={() => onRestore(false)}
                variant="outline"
              >
                <Undo2Icon className="size-4 mr-2" />
                Restore Only
              </Button>
              {analysis.summary.deletedDependents > 0 && (
                <Button disabled={loading} onClick={() => onRestore(true)}>
                  <Undo2Icon className="size-4 mr-2" />
                  Cascade Restore
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
