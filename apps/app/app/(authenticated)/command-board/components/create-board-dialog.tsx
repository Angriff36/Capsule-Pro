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
import {
  Briefcase,
  Calendar,
  ChefHat,
  ListTodo,
  Loader2Icon,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createCommandBoard } from "../actions/boards-create";
import { BOARD_TEMPLATES, type BoardTemplate } from "../config/board-templates";

interface CreateBoardDialogProps {
  trigger?: React.ReactNode;
}

// Map icon names to components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  ChefHat,
  Users,
  Briefcase,
  ListTodo,
  Package,
  Plus,
};

export function CreateBoardDialog({ trigger }: CreateBoardDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<BoardTemplate | null>(null);

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
        templateId: selectedTemplate?.id,
      });

      if (result.success && result.board) {
        toast.success("Board created successfully");
        setOpen(false);
        setName("");
        setDescription("");
        setSelectedTemplate(null);
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

  const handleTemplateSelect = (template: BoardTemplate) => {
    setSelectedTemplate(template);
    // Auto-fill name with prefix if name is empty or was previously set by a template
    if (
      !name.trim() ||
      BOARD_TEMPLATES.some((t) => name.startsWith(t.namePrefix ?? ""))
    ) {
      setName(template.namePrefix ?? "");
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
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Choose a template to get started quickly, or start from scratch.
            </DialogDescription>
          </DialogHeader>

          {/* Template Selector */}
          <div className="py-4">
            <p className="text-sm font-medium leading-none mb-3 block">
              Choose a Template
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BOARD_TEMPLATES.map((template) => {
                const IconComponent = ICON_MAP[template.icon] || Plus;
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <button
                    className={`
                      flex flex-col items-start p-3 rounded-lg border text-left
                      transition-all duration-150 group
                      ${
                        isSelected
                          ? `${template.color?.bg || "bg-primary/10"} ${
                              template.color?.border || "border-primary"
                            } ring-2 ring-primary/50`
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    disabled={isLoading}
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    type="button"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent
                        className={`h-4 w-4 ${
                          isSelected
                            ? template.color?.icon || "text-primary"
                            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {template.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board Details */}
          <div className="grid gap-4 py-4 border-t border-slate-200 dark:border-slate-700">
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
                rows={2}
                value={description}
              />
            </div>

            {/* Selected Template Info */}
            {selectedTemplate && selectedTemplate.id !== "blank" && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-md p-2">
                <span className="font-medium">Will auto-populate with:</span>
                <span>
                  {selectedTemplate.scope.entityTypes.length > 0
                    ? selectedTemplate.scope.entityTypes.join(", ")
                    : "No entities"}
                  {selectedTemplate.scope.dateRange && (
                    <span className="ml-1">
                      ({selectedTemplate.scope.dateRange.start} to{" "}
                      {selectedTemplate.scope.dateRange.end})
                    </span>
                  )}
                </span>
              </div>
            )}
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

// Keep the original PlusIcon reference
function PlusIcon({ className }: { className?: string }) {
  return <Plus className={className} />;
}
