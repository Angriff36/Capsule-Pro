"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  EllipsisIcon,
  HomeIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Redo2Icon,
  TrashIcon,
  Undo2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteCommandBoard, updateCommandBoard } from "../actions/boards";
import type { CommandBoard } from "../types";

interface BoardHeaderProps {
  boardId: string;
  boardName?: string;
  boardStatus?: string;
  boardDescription?: string | null;
  boardTags?: string[];
  onBoardUpdated?: (board: CommandBoard) => void;
  // Undo/Redo props
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function BoardHeader({
  boardId,
  boardName = "Command Board",
  boardStatus = "active",
  boardDescription,
  boardTags,
  onBoardUpdated,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: BoardHeaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [_isDeleting, setIsDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(boardName);
  const [editDescription, setEditDescription] = useState(
    boardDescription || ""
  );

  const handleSwitchBoard = async () => {
    router.push("/command-board");
  };

  const handleCreateNew = async () => {
    router.push("/command-board?create=true");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateCommandBoard({
        id: boardId,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });

      if (result.success && result.board) {
        toast.success("Board updated successfully");
        setShowEdit(false);
        onBoardUpdated?.(result.board);
      } else {
        toast.error(result.error || "Failed to update board");
      }
    } catch {
      toast.error("Failed to update board");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${boardName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteCommandBoard(boardId);

      if (result.success) {
        toast.success("Board deleted successfully");
        router.push("/command-board");
      } else {
        toast.error(result.error || "Failed to delete board");
      }
    } catch {
      toast.error("Failed to delete board");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "draft":
        return "bg-gray-400";
      case "archived":
        return "bg-yellow-600";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <header className="bg-muted/50 border-b px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* Home button */}
          <Button
            className="h-8 w-8 shrink-0"
            onClick={handleSwitchBoard}
            size="icon"
            title="All Boards"
            variant="ghost"
          >
            <HomeIcon className="h-4 w-4" />
          </Button>

          <Separator className="h-6" orientation="vertical" />

          {/* Board info */}
          <div className="min-w-0 flex-1">
            {showEdit ? (
              <form
                className="flex items-center gap-2"
                onSubmit={handleEditSubmit}
              >
                <input
                  autoFocus
                  className="bg-background focus:border-ring focus:ring-ring/50 h-7 w-64 rounded-md border px-2 text-sm outline-none focus:ring-[3px]"
                  disabled={isLoading}
                  onChange={(e) => setEditName(e.target.value)}
                  type="text"
                  value={editName}
                />
                <Button
                  className="h-7"
                  disabled={isLoading || !editName.trim()}
                  size="sm"
                  type="submit"
                  variant="default"
                >
                  {isLoading ? (
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button
                  className="h-7"
                  onClick={() => {
                    setShowEdit(false);
                    setEditName(boardName);
                    setEditDescription(boardDescription || "");
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${getStatusColor(boardStatus)}`}
                />
                <h1 className="truncate text-sm font-semibold">{boardName}</h1>
                {boardTags && boardTags.length > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({boardTags.length}{" "}
                    {boardTags.length === 1 ? "tag" : "tags"})
                  </span>
                )}
              </div>
            )}
            {boardDescription && !showEdit && (
              <p className="text-muted-foreground truncate text-xs">
                {boardDescription}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo buttons */}
          {(onUndo || onRedo) && (
            <>
              <Button
                disabled={!canUndo}
                onClick={onUndo}
                size="sm"
                title="Undo (Ctrl+Z)"
                variant="outline"
              >
                <Undo2Icon className="h-4 w-4" />
              </Button>
              <Button
                disabled={!canRedo}
                onClick={onRedo}
                size="sm"
                title="Redo (Ctrl+Shift+Z)"
                variant="outline"
              >
                <Redo2Icon className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            className="hidden sm:flex"
            onClick={handleSwitchBoard}
            size="sm"
            variant="outline"
          >
            All Boards
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8" size="icon" variant="ghost">
                <EllipsisIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/command-board")}>
                <HomeIcon className="mr-2 h-4 w-4" />
                All Boards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateNew}>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Board
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowEdit(!showEdit)}>
                <PencilIcon className="mr-2 h-4 w-4" />
                {showEdit ? "Cancel Edit" : "Edit Board"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                Delete Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
