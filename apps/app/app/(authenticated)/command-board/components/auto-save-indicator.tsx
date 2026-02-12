"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { differenceInSeconds, format } from "date-fns";
import { Check, Clock, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  onSaveNow?: () => void;
}

const timeFormats = {
  justNow: (_date: Date) => "Saved just now",
  seconds: (date: Date) => {
    const seconds = Math.floor(differenceInSeconds(new Date(), date));
    if (seconds < 60) {
      return `Saved ${seconds}s ago`;
    }
    return null;
  },
  minutes: (date: Date) => {
    const minutes = Math.floor(differenceInSeconds(new Date(), date) / 60);
    if (minutes < 60) {
      return `Saved ${minutes}m ago`;
    }
    return null;
  },
  hours: (date: Date) => {
    const hours = Math.floor(differenceInSeconds(new Date(), date) / 3600);
    if (hours < 24) {
      return `Saved ${hours}h ago`;
    }
    return null;
  },
  days: (date: Date) => `Saved on ${format(date, "MMM d, yyyy")}`,
};

export function AutoSaveIndicator({
  isSaving,
  lastSavedAt,
  hasUnsavedChanges,
  onSaveNow,
}: AutoSaveIndicatorProps) {
  const [timeSinceSaved, setTimeSinceSaved] = useState<string>(() =>
    lastSavedAt ? getFormattedTime(lastSavedAt) : "Never saved"
  );

  // Update time display every 30 seconds when showing relative time
  useEffect(() => {
    if (!lastSavedAt) {
      return;
    }

    const timer = setInterval(() => {
      setTimeSinceSaved(getFormattedTime(lastSavedAt));
    }, 30_000);

    return () => clearInterval(timer);
  }, [lastSavedAt, getFormattedTime]);

  const getFormattedTime = useCallback((date: Date): string => {
    // Check formats in order from most recent to oldest
    for (const [key, formatter] of Object.entries(timeFormats)) {
      if (key === "justNow") {
        continue; // Special case
      }

      const result = formatter(date);
      if (result) {
        return result;
      }
    }

    // Fallback to days format
    return timeFormats.days(date);
  }, []);

  const handleSaveNow = () => {
    onSaveNow?.();
  };

  const getStatusContent = () => {
    if (isSaving) {
      return (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      );
    }

    if (hasUnsavedChanges) {
      return (
        <>
          <Clock className="h-3 w-3 text-amber-500" />
          <span>Unsaved changes</span>
        </>
      );
    }

    if (lastSavedAt) {
      return (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span>{timeSinceSaved}</span>
        </>
      );
    }

    return (
      <>
        <Check className="h-3 w-3 text-slate-400" />
        <span>Never saved</span>
      </>
    );
  };

  const _getStatusVariant = () => {
    if (isSaving) {
      return "secondary";
    }
    if (hasUnsavedChanges) {
      return "destructive";
    }
    return "secondary";
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
          {
            "bg-blue-100 text-blue-700": isSaving,
            "bg-amber-100 text-amber-700": hasUnsavedChanges,
            "bg-green-100 text-green-700":
              !(isSaving || hasUnsavedChanges) && lastSavedAt,
            "bg-slate-100 text-slate-600": !(
              isSaving ||
              hasUnsavedChanges ||
              lastSavedAt
            ),
          }
        )}
      >
        {getStatusContent()}
      </div>

      {hasUnsavedChanges && onSaveNow && (
        <Button
          className="h-6 w-6 p-0"
          onClick={handleSaveNow}
          size="sm"
          title="Save now"
          variant="ghost"
        >
          <Save className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
