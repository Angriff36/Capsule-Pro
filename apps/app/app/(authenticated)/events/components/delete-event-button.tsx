"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteEventById } from "../actions";

interface DeleteEventButtonProps {
  eventId: string;
  eventTitle: string;
  variant?:
    | "default"
    | "ghost"
    | "destructive"
    | "link"
    | "outline"
    | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** When true, show icon-only button (for list cards). */
  iconOnly?: boolean;
}

export function DeleteEventButton({
  eventId,
  eventTitle,
  variant = "destructive",
  size = "sm",
  className,
  iconOnly = false,
}: DeleteEventButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteEventById(eventId);
        toast.success("Event deleted");
      } catch (error) {
        console.error("Failed to delete event:", error);
        toast.error("Failed to delete event. Please try again.");
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={`Delete event ${eventTitle}`}
          className={className}
          disabled={isPending}
          size={size}
          variant={variant}
        >
          {iconOnly ? (
            <Trash2Icon className="size-4" />
          ) : (
            <>
              <Trash2Icon className="size-4" />
              Delete event
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete event?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove &quot;{eventTitle}&quot; from the list. You can’t
            undo this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
