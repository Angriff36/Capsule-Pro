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

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Remove "${tag}" from all ${clientCount} client${clientCount !== 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      await deleteTagGlobally(tag);
      toast.success(`Tag "${tag}" removed from all clients`);
    } catch (error) {
      toast.error("Failed to delete tag", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={loading}
            onClick={handleDelete}
            size="icon"
            variant="ghost"
          >
            <TrashIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remove &quot;{tag}&quot; from all clients</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
