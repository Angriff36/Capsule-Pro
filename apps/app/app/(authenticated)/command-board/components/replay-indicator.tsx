/**
 * Replay Indicator Component
 *
 * Shows the progress of event replay when a user joins a command board,
 * displaying how many events have been processed.
 */

import { Button } from "@repo/design-system/components/ui/button";
import { Progress } from "@repo/design-system/components/ui/progress";
import { type ReplayState } from "@repo/realtime";
import { X } from "lucide-react";

interface ReplayIndicatorProps {
  /** Current replay state */
  state: ReplayState;
  /** Number of events processed */
  processedCount: number;
  /** Total number of events to replay */
  totalCount: number;
  /** Callback when user dismisses the indicator */
  onDismiss: () => void;
  /** Callback when user skips the replay */
  onSkip?: () => void;
}

/**
 * Shows replay progress with a progress bar and status message
 */
export function ReplayIndicator({
  state,
  processedCount,
  totalCount,
  onDismiss,
  onSkip,
}: ReplayIndicatorProps) {
  // Don't show if idle or completed
  if (state === "idle" || state === "completed") {
    return null;
  }

  const progress = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;

  const getStateMessage = () => {
    switch (state) {
      case "fetching":
        return "Fetching recent activity...";
      case "replaying":
        return `Replaying board activity... (${processedCount}/${totalCount})`;
      case "paused":
        return "Replay paused";
      case "error":
        return "Failed to load board activity";
      default:
        return "Loading...";
    }
  };

  const getStateVariant = (): "default" | "destructive" | "loading" => {
    switch (state) {
      case "fetching":
      case "replaying":
        return "loading";
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="bg-background/95 backdrop-blur-sm border-border fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border px-4 py-3 shadow-lg">
      {/* Status text */}
      <span className="text-sm font-medium">{getStateMessage()}</span>

      {/* Progress bar */}
      {(state === "fetching" || state === "replaying") && (
        <Progress
          className="w-32"
          value={progress}
        />
      )}

      {/* Skip button (only during replay) */}
      {state === "replaying" && onSkip && (
        <Button
          onClick={onSkip}
          size="sm"
          variant="ghost"
        >
          Skip
        </Button>
      )}

      {/* Dismiss button */}
      <button
        className="text-muted-foreground hover:text-foreground transition-colors rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
