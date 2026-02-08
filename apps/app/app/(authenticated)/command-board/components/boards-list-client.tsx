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
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarIcon,
  DotIcon,
  EllipsisIcon,
  Loader2Icon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteCommandBoard,
  listCommandBoards,
  updateCommandBoard,
} from "../actions/boards";
import type { CommandBoard } from "../types";
import { CreateBoardDialog } from "./create-board-dialog";

export function BoardsListClient() {
  const router = useRouter();
  const [boards, setBoards] = useState<CommandBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit dialog state
  const [editBoard, setEditBoard] = useState<CommandBoard | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deleteBoard, setDeleteBoard] = useState<CommandBoard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listCommandBoards();
      setBoards(data);
    } catch {
      toast.error("Failed to load boards");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Filter boards
  const filteredBoards = boards.filter((board) => {
    const matchesSearch =
      board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (board.description?.toLowerCase().includes(searchQuery.toLowerCase()) ??
        false);
    const matchesStatus =
      statusFilter === "all" || board.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenBoard = (boardId: string) => {
    router.push(`/command-board/${boardId}`);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBoard) return;

    setIsUpdating(true);
    try {
      const result = await updateCommandBoard({
        id: editBoard.id,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });

      if (result.success && result.board) {
        toast.success("Board updated successfully");
        setBoards((prev) =>
          prev.map((b) => (b.id === editBoard.id ? result.board! : b))
        );
        setEditBoard(null);
        setEditName("");
        setEditDescription("");
      } else {
        toast.error(result.error || "Failed to update board");
      }
    } catch {
      toast.error("Failed to update board");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBoard) return;

    setIsDeleting(true);
    try {
      const result = await deleteCommandBoard(deleteBoard.id);

      if (result.success) {
        toast.success("Board deleted successfully");
        setBoards((prev) => prev.filter((b) => b.id !== deleteBoard.id));
        setDeleteBoard(null);
      } else {
        toast.error(result.error || "Failed to delete board");
      }
    } catch {
      toast.error("Failed to delete board");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (board: CommandBoard) => {
    setEditBoard(board);
    setEditName(board.name);
    setEditDescription(board.description || "");
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
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Boards</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your strategic command boards
          </p>
        </div>
        <CreateBoardDialog />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Input
            className="max-w-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search boards..."
            value={searchQuery}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Status: {statusFilter === "all" ? "All" : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                <DotIcon className="mr-2 h-4 w-4 text-green-500" />
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("draft")}>
                <DotIcon className="mr-2 h-4 w-4 text-gray-400" />
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("archived")}>
                <DotIcon className="mr-2 h-4 w-4 text-yellow-600" />
                Archived
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Boards Grid */}
      {isLoading && boards.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading boards...</p>
          </div>
        </div>
      ) : filteredBoards.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-6">
              <DotIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No boards found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Create your first board to get started"}
              </p>
            </div>
            {!searchQuery && statusFilter === "all" && <CreateBoardDialog />}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBoards.map((board) => (
            <Card
              className="group cursor-pointer transition-shadow hover:shadow-md"
              key={board.id}
              onClick={() => handleOpenBoard(board.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-1">{board.name}</CardTitle>
                    {board.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {board.description}
                      </CardDescription>
                    )}
                  </div>
                  <CardAction>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                          variant="ghost"
                        >
                          <EllipsisIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(board);
                          }}
                        >
                          <PencilIcon className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteBoard(board);
                          }}
                        >
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardAction>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${getStatusColor(board.status)}`}
                    />
                    <span className="text-sm text-muted-foreground capitalize">
                      {board.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(board.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                {board.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {board.tags.slice(0, 3).map((tag) => (
                      <Badge className="text-xs" key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    {board.tags.length > 3 && (
                      <Badge className="text-xs" variant="secondary">
                        +{board.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Board Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setEditBoard(null)}
        open={!!editBoard}
      >
        <AlertDialogContent>
          <form onSubmit={handleEditSubmit}>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Board</AlertDialogTitle>
              <AlertDialogDescription>
                Update the board name and description.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Board Name</label>
                <Input
                  autoFocus
                  disabled={isUpdating}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Board name"
                  value={editName}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  disabled={isUpdating}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Board description"
                  value={editDescription}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isUpdating || !editName.trim()}
                onClick={(e) => {
                  e.preventDefault();
                  handleEditSubmit(e);
                }}
                type="submit"
              >
                {isUpdating && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteBoard(null)}
        open={!!deleteBoard}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteBoard?.name}&quot;?
              This action cannot be undone.
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
    </div>
  );
}
