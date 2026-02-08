"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { listCommandBoards } from "../actions/boards";
import type { CommandBoard } from "../types";

interface BoardSelectorProps {
  currentBoardId?: string;
  trigger?: React.ReactNode;
}

export function BoardSelector({ currentBoardId, trigger }: BoardSelectorProps) {
  const router = useRouter();
  const [boards, setBoards] = useState<CommandBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listCommandBoards();
      setBoards(data);
    } catch {
      // Silently fail - boards just won't show
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBoards();
    }
  }, [isOpen, fetchBoards]);

  const handleSelectBoard = (boardId: string) => {
    router.push(`/command-board/${boardId}`);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    router.push("/command-board?create=true");
    setIsOpen(false);
  };

  const currentBoard = boards.find((b) => b.id === currentBoardId);

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
    <DropdownMenu onOpenChange={setOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button className="justify-start" variant="outline">
            {currentBoard ? (
              <>
                <div
                  className={`mr-2 h-2 w-2 rounded-full ${getStatusColor(currentBoard.status)}`}
                />
                <span className="truncate">{currentBoard.name}</span>
              </>
            ) : (
              "Select Board..."
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Command Boards</span>
            <span className="text-muted-foreground text-xs">
              {boards.length}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : boards.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No boards yet
            </div>
          ) : (
            boards.map((board) => (
              <DropdownMenuItem
                className="flex items-center gap-2"
                key={board.id}
                onClick={() => handleSelectBoard(board.id)}
              >
                <div
                  className={`h-2 w-2 shrink-0 rounded-full ${getStatusColor(board.status)}`}
                />
                <div className="flex-1 truncate">
                  <span className="truncate">{board.name}</span>
                  {board.id === currentBoardId && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      (current)
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateNew}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create New Board
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
