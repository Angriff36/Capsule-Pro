"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createCommandBoard, listCommandBoards } from "../actions/boards";
import { addProjection } from "../actions/projections";
import type { CommandBoard } from "../actions/boards";
import type { EntityType } from "../types/entities";

/** Map legacy entity type names to the new EntityType union */
const LEGACY_ENTITY_MAP: Record<string, EntityType> = {
  event: "event",
  client: "client",
  task: "prep_task",
  employee: "employee",
  inventory: "inventory_item",
};

export interface AddToBoardDialogProps {
  /** The type of entity being added to the board */
  entityType: "event" | "client" | "task" | "employee" | "inventory";
  /** The ID of the entity being added */
  entityId: string;
  /** Default name for a new board (e.g., event title) */
  defaultBoardName?: string;
  /** Optional description for a new board */
  defaultBoardDescription?: string;
  /** Optional trigger element */
  trigger?: React.ReactNode;
  /** Callback after successfully adding to board */
  onAdded?: () => void;
}

export function AddToBoardDialog({
  entityType,
  entityId,
  defaultBoardName = "",
  defaultBoardDescription = "",
  trigger,
  onAdded,
}: AddToBoardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListingBoards, setIsListingBoards] = useState(false);
  const [boards, setBoards] = useState<CommandBoard[]>([]);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [newBoardName, setNewBoardName] = useState(defaultBoardName);
  const [newBoardDescription, setNewBoardDescription] = useState(
    defaultBoardDescription
  );

  const entityTypeLabel = {
    event: "Event",
    client: "Client",
    task: "Task",
    employee: "Employee",
    inventory: "Inventory Item",
  }[entityType];

  const fetchBoards = useCallback(async () => {
    setIsListingBoards(true);
    try {
      const data = await listCommandBoards();
      setBoards(data);
    } catch {
      // Silently fail
    } finally {
      setIsListingBoards(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchBoards();
      setNewBoardName(defaultBoardName);
      setNewBoardDescription(defaultBoardDescription);
    }
  }, [open, fetchBoards, defaultBoardName, defaultBoardDescription]);

  const handleAddToExistingBoard = async () => {
    if (!selectedBoardId) {
      toast.error("Please select a board");
      return;
    }

    setIsLoading(true);

    try {
      const projectionEntityType = LEGACY_ENTITY_MAP[entityType] ?? "event";
      const result = await addProjection(selectedBoardId, {
        entityType: projectionEntityType,
        entityId,
        positionX: 100,
        positionY: 100,
        width: 280,
        height: 180,
      });

      if (result.success) {
        toast.success(`${entityTypeLabel} added to board`);
        setOpen(false);
        onAdded?.();
        router.push(`/command-board/${selectedBoardId}`);
      } else {
        toast.error(
          result.error ||
            `Failed to add ${entityTypeLabel.toLowerCase()} to board`
        );
      }
    } catch {
      toast.error(`Failed to add ${entityTypeLabel.toLowerCase()} to board`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewBoard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBoardName.trim()) {
      toast.error("Board name is required");
      return;
    }

    setIsLoading(true);

    try {
      // Create board linked to this event/entity
      const result = await createCommandBoard({
        name: newBoardName.trim(),
        description: newBoardDescription.trim() || undefined,
        eventId: entityType === "event" ? entityId : undefined,
        isTemplate: false,
        tags: entityType === "event" ? ["event"] : undefined,
      });

      if (result.success && result.board) {
        // Add the entity projection to the new board
        const projectionEntityType = LEGACY_ENTITY_MAP[entityType] ?? "event";
        await addProjection(result.board.id, {
          entityType: projectionEntityType,
          entityId,
          positionX: 100,
          positionY: 100,
          width: 280,
          height: 180,
        });

        toast.success(
          `Board created and ${entityTypeLabel.toLowerCase()} added`
        );
        setOpen(false);
        onAdded?.();
        router.push(`/command-board/${result.board.id}`);
      } else {
        toast.error(result.error || "Failed to create board");
      }
    } catch {
      toast.error("Failed to create board");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add to Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {mode === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>Add {entityTypeLabel} to Board</DialogTitle>
              <DialogDescription>
                Choose an existing board or create a new one for this{" "}
                {entityTypeLabel.toLowerCase()}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isListingBoards ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : boards.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No boards found. Create your first board to get started.
                  </p>
                  <Button
                    onClick={() => setMode("create")}
                    size="sm"
                    variant="outline"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create Board
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Existing Boards</Label>
                  {boards.map((board) => (
                    <button
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${
                        selectedBoardId === board.id
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                      key={board.id}
                      onClick={() => setSelectedBoardId(board.id)}
                      type="button"
                    >
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          board.status === "active"
                            ? "bg-green-500"
                            : "bg-gray-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {board.name}
                        </p>
                        {board.description && (
                          <p className="text-muted-foreground text-xs truncate">
                            {board.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                onClick={() => setMode("create")}
                type="button"
                variant="outline"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                New Board
              </Button>
              <Button
                disabled={!selectedBoardId || isLoading}
                onClick={handleAddToExistingBoard}
              >
                {isLoading && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add to Selected Board
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create New Board</DialogTitle>
              <DialogDescription>
                Create a new command board for this{" "}
                {entityTypeLabel.toLowerCase()}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateNewBoard}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-board-name">Board Name</Label>
                  <Input
                    autoFocus
                    disabled={isLoading}
                    id="new-board-name"
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="My Command Board"
                    value={newBoardName}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-board-description">
                    Description (optional)
                  </Label>
                  <Input
                    disabled={isLoading}
                    id="new-board-description"
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    placeholder="What is this board for?"
                    value={newBoardDescription}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  disabled={isLoading}
                  onClick={() => setMode("select")}
                  type="button"
                  variant="outline"
                >
                  Back to Boards
                </Button>
                <Button
                  disabled={isLoading || !newBoardName.trim()}
                  type="submit"
                >
                  {isLoading && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create & Add
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
