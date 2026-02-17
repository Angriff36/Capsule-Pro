"use client";

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
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  BotIcon,
  EllipsisIcon,
  HomeIcon,
  KeyboardIcon,
  LayoutGridIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Redo2Icon,
  TerminalSquareIcon,
  TrashIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { CommandBoard } from "../actions/boards";
import { deleteCommandBoard, updateCommandBoard } from "../actions/boards";

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
  // Entity browser toggle
  entityBrowserOpen?: boolean;
  onToggleEntityBrowser?: () => void;
  // Command palette toggle
  commandPaletteOpen?: boolean;
  onToggleCommandPalette?: () => void;
  // AI chat toggle
  aiChatOpen?: boolean;
  onToggleAiChat?: () => void;
  // Fullscreen exit
  onExitFullscreen?: () => void;
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
  entityBrowserOpen = false,
  onToggleEntityBrowser,
  commandPaletteOpen = false,
  onToggleCommandPalette,
  aiChatOpen = false,
  onToggleAiChat,
  onExitFullscreen,
}: BoardHeaderProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState(boardName);
  const [editDescription, setEditDescription] = useState(
    boardDescription || ""
  );

  const handleSwitchBoard = () => {
    router.push("/command-board");
  };

  const handleCreateNew = () => {
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

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
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
      setDeleteDialogOpen(false);
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
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{boardName}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          {onToggleEntityBrowser && (
            <Button
              className="hidden sm:flex"
              onClick={onToggleEntityBrowser}
              size="sm"
              title="Browse Entities (Ctrl+E)"
              variant={entityBrowserOpen ? "default" : "outline"}
            >
              <LayoutGridIcon className="mr-1.5 h-4 w-4" />
              Entities
            </Button>
          )}
          {onToggleCommandPalette && (
            <Button
              className="hidden sm:flex"
              onClick={onToggleCommandPalette}
              size="sm"
              title="Commands (Ctrl+K)"
              variant={commandPaletteOpen ? "default" : "outline"}
            >
              <TerminalSquareIcon className="mr-1.5 h-4 w-4" />
              Commands
            </Button>
          )}
          {onToggleAiChat && (
            <Button
              className="hidden sm:flex"
              onClick={onToggleAiChat}
              size="sm"
              title="AI Assistant (Ctrl+J)"
              variant={aiChatOpen ? "default" : "outline"}
            >
              <BotIcon className="mr-1.5 h-4 w-4" />
              AI Assistant
            </Button>
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
              {onToggleEntityBrowser && (
                <DropdownMenuItem onClick={onToggleEntityBrowser}>
                  <LayoutGridIcon className="mr-2 h-4 w-4" />
                  Entities (Ctrl+E)
                </DropdownMenuItem>
              )}
              {onToggleCommandPalette && (
                <DropdownMenuItem onClick={onToggleCommandPalette}>
                  <TerminalSquareIcon className="mr-2 h-4 w-4" />
                  Commands (Ctrl+K)
                </DropdownMenuItem>
              )}
              {onToggleAiChat && (
                <DropdownMenuItem onClick={onToggleAiChat}>
                  <BotIcon className="mr-2 h-4 w-4" />
                  AI Assistant (Ctrl+J)
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled>
                <KeyboardIcon className="mr-2 h-4 w-4" />
                Undo/Redo: Ctrl+Z / Ctrl+Shift+Z
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

          {onExitFullscreen && (
            <>
              <Separator className="h-6" orientation="vertical" />
              <Button
                className="h-8 w-8 shrink-0"
                onClick={onExitFullscreen}
                size="icon"
                title="Exit board (Escape)"
                variant="ghost"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
