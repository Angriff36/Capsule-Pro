"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";

interface DevModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function DevModeToggle({ enabled, onToggle }: DevModeToggleProps) {
  return (
    <Button
      className="gap-2"
      onClick={() => onToggle(!enabled)}
      size="sm"
      variant={enabled ? "destructive" : "outline"}
    >
      {enabled ? (
        <>
          <Badge className="text-[10px]" variant="secondary">
            DEV
          </Badge>
          Exit Dev Mode
        </>
      ) : (
        "Dev Mode"
      )}
    </Button>
  );
}
