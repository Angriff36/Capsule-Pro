"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import type { ConstraintOutcome } from "@repo/manifest";
import { OVERRIDE_REASON_CODES, type OverrideReasonCode } from "@repo/manifest";
import { AlertCircle, Info, ShieldAlert, TriangleAlert } from "lucide-react";
import * as React from "react";

export interface ConstraintOverrideDialogProps {
  /**
   * The constraint outcomes that require override
   */
  constraints: ConstraintOutcome[];
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Callback when the user confirms the override
   */
  onConfirm: (reason: OverrideReasonCode, details: string) => void;
  /**
   * Callback when the user cancels
   */
  onCancel?: () => void;
  /**
   * Title for the dialog (default: "Action Blocked")
   */
  title?: string;
  /**
   * Description for the dialog (default: explains constraints)
   */
  description?: string;
  /**
   * The action the user is trying to perform (e.g., "claim this task")
   */
  actionDescription?: string;
  /**
   * Whether the user has permission to override
   */
  canOverride?: boolean;
}

export function ConstraintOverrideDialog({
  constraints,
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = "Action Blocked",
  description,
  actionDescription = "perform this action",
  canOverride = true,
}: ConstraintOverrideDialogProps) {
  const [selectedReason, setSelectedReason] =
    React.useState<OverrideReasonCode>("other");
  const [additionalDetails, setAdditionalDetails] = React.useState("");

  const handleConfirm = () => {
    onConfirm(selectedReason, additionalDetails);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  // Filter to only show blocking and warning constraints
  const actionableConstraints = constraints.filter(
    (c) => !c.passed && (c.severity === "warn" || c.severity === "block")
  );

  if (actionableConstraints.length === 0) {
    return null;
  }

  const hasBlocking = actionableConstraints.some((c) => c.severity === "block");
  const hasWarnings = actionableConstraints.some((c) => c.severity === "warn");

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {hasBlocking ? (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            ) : (
              <TriangleAlert className="h-5 w-5 text-warning" />
            )}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description || (
              <>
                This {actionDescription} is blocked by{" "}
                {hasBlocking && hasWarnings
                  ? "blocking constraints and warnings"
                  : hasBlocking
                    ? "blocking constraints"
                    : "warnings"}
                . You can proceed with an override, or cancel to address the
                issues.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-[300px] overflow-y-auto space-y-3 py-2">
          {actionableConstraints.map((constraint, index) => (
            <ConstraintAlert constraint={constraint} key={index} />
          ))}
        </div>

        <Separator />

        {canOverride ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="override-reason"
              >
                Reason for override
              </label>
              <Select
                onValueChange={(value) =>
                  setSelectedReason(value as OverrideReasonCode)
                }
                value={selectedReason}
              >
                <SelectTrigger id="override-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OVERRIDE_REASON_CODES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="override-details"
              >
                Additional details (optional)
              </label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="override-details"
                onChange={(e) => setAdditionalDetails(e.target.value)}
                placeholder="Provide any additional context for this override..."
                value={additionalDetails}
              />
            </div>

            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertTitle>Override will be recorded</AlertTitle>
              <AlertDescription>
                This override will be logged with your user ID and the reason
                provided.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Override not permitted</AlertTitle>
            <AlertDescription>
              You don't have permission to override these constraints. Please
              contact a manager.
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          {canOverride && (
            <AlertDialogAction onClick={handleConfirm}>
              Proceed with Override
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ConstraintAlertProps {
  constraint: ConstraintOutcome;
}

function ConstraintAlert({ constraint }: ConstraintAlertProps) {
  const severityConfig = {
    ok: { icon: Info, variant: "default" as const, bg: "bg-muted" },
    warn: {
      icon: TriangleAlert,
      variant: "warning" as const,
      bg: "bg-warning/10",
    },
    block: {
      icon: ShieldAlert,
      variant: "destructive" as const,
      bg: "bg-destructive/10",
    },
  };

  const config = severityConfig[constraint.severity] || severityConfig.ok;
  const Icon = config.icon;

  return (
    <Alert className={config.bg} variant={config.variant}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {constraint.message || constraint.constraintName}
        <Badge className="ml-2 text-xs" variant="outline">
          {constraint.severity.toUpperCase()}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="mt-1 text-xs opacity-80">{constraint.formatted}</div>
        {constraint.details && Object.keys(constraint.details).length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {Object.entries(constraint.details).map(([key, value]) => (
              <div className="flex gap-1" key={key}>
                <span className="opacity-60">{key}:</span>
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook to manage constraint override state and callbacks
 */
export function useConstraintOverride<
  T extends { constraintOutcomes?: ConstraintOutcome[]; success?: boolean },
>({
  result,
  onSuccess,
  onError,
  onOverride,
}: {
  result: T;
  onSuccess?: (data: T) => void;
  onError?: (error: string, data: T) => void;
  onOverride?: (reason: OverrideReasonCode, details: string, data: T) => void;
}) {
  const [showOverrideDialog, setShowOverrideDialog] = React.useState(false);
  const [overrideConstraints, setOverrideConstraints] = React.useState<
    ConstraintOutcome[]
  >([]);

  // Check if we need to show override dialog
  React.useEffect(() => {
    if (result?.constraintOutcomes && result.constraintOutcomes.length > 0) {
      const blocking = result.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      );
      if (blocking.length > 0 && !result.success) {
        setOverrideConstraints(blocking);
        setShowOverrideDialog(true);
      }
    }
  }, [result]);

  const handleSuccess = (data: T) => {
    onSuccess?.(data);
  };

  const handleError = (error: string, data: T) => {
    onError?.(error, data);
  };

  const handleOverride = (reason: OverrideReasonCode, details: string) => {
    onOverride?.(reason, details, result);
    setShowOverrideDialog(false);
  };

  const handleCancel = () => {
    setShowOverrideDialog(false);
  };

  return {
    showOverrideDialog,
    setShowOverrideDialog,
    overrideConstraints,
    handleSuccess,
    handleError,
    handleOverride,
    handleCancel,
    // Helper to check if we have blocking constraints
    hasBlockingConstraints:
      result?.constraintOutcomes?.filter(
        (c) => !c.passed && c.severity === "block"
      ).length ?? 0,
    // Helper to get all actionable constraints
    actionableConstraints:
      result?.constraintOutcomes?.filter(
        (c) => !c.passed && (c.severity === "warn" || c.severity === "block")
      ) ?? [],
  };
}
