"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteTagGlobally } from "../../clients/actions";

interface DeleteTagButtonProps {
  tag: string;
  clientCount: number;
}

export function DeleteTagButton({ tag, clientCount }: DeleteTagButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      await deleteTagGlobally(tag);
      toast.success(`Tag "${tag}" removed from all clients`);
      setConfirming(false);
    } catch (error) {
      toast.error("Failed to delete tag", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          disabled={loading}
          onClick={handleConfirmDelete}
          size="sm"
          variant="destructive"
        >
          Confirm
        </Button>
        <Button
          disabled={loading}
          onClick={() => setConfirming(false)}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setConfirming(true)}
            size="icon"
            variant="ghost"
          >
            <TrashIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Remove &quot;{tag}&quot; from all {clientCount}{" "}
          {clientCount === 1 ? "client" : "clients"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
