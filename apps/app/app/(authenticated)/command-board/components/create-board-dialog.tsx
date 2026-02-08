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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createCommandBoard } from "../actions/boards";

interface CreateBoardDialogProps {
  trigger?: React.ReactNode;
}

export function CreateBoardDialog({ trigger }: CreateBoardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Board name is required");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createCommandBoard({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (result.success && result.board) {
        toast.success("Board created successfully");
        setOpen(false);
        setName("");
        setDescription("");
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
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Board
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Create a new command board to organize your tasks, events, and
              resources.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="board-name"
              >
                Board Name
              </label>
              <Input
                autoFocus
                disabled={isLoading}
                id="board-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="My Command Board"
                value={name}
              />
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="board-description"
              >
                Description (optional)
              </label>
              <Textarea
                disabled={isLoading}
                id="board-description"
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this board for?"
                rows={3}
                value={description}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isLoading}
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isLoading || !name.trim()} type="submit">
              {isLoading && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
