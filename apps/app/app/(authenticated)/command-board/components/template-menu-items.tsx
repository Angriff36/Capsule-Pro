"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { DropdownMenuItem } from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  CalendarIcon,
  ChefHatIcon,
  CopyIcon,
  GlobeIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  LockIcon,
  PackageIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type BoardTemplate,
  createBoardFromTemplate,
  createTemplateFromBoard,
  deleteBoardTemplate,
  listBoardTemplates,
  updateBoardTemplate,
} from "../actions/templates";

// ============================================================================
// Save as Template Menu Item
// ============================================================================

interface SaveAsTemplateMenuItemProps {
  boardId: string;
  boardName?: string;
  boardDescription?: string | null;
  onTemplateCreated?: () => void;
  onSelect?: () => void;
}

export function SaveAsTemplateMenuItem({
  boardId,
  boardName,
  boardDescription,
  onTemplateCreated,
  onSelect,
}: SaveAsTemplateMenuItemProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(`${boardName} - Template` || "");
  const [description, setDescription] = useState(boardDescription || "");
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createTemplateFromBoard(boardId, {
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      });

      if (result.success) {
        toast.success("Template created successfully", {
          description: isPublic
            ? "Your template is now publicly shareable."
            : "Your template has been saved.",
        });
        setOpen(false);
        onTemplateCreated?.();

        // Reset form
        setName(`${boardName} - Template` || "");
        setDescription(boardDescription || "");
        setIsPublic(false);
      } else {
        toast.error(result.error || "Failed to create template");
      }
    } catch {
      toast.error("Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
          onSelect?.();
        }}
      >
        <CopyIcon className="mr-2 h-4 w-4" />
        Save as Template
      </DropdownMenuItem>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save this board configuration as a reusable template.{" "}
                {isPublic
                  ? "Public templates can be shared with others via a link."
                  : "Private templates are only visible to your organization."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekly Event Planning"
                  required
                  value={name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  rows={3}
                  value={description}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="cursor-pointer" htmlFor="is-public">
                      Make Public
                    </Label>
                    {isPublic ? (
                      <GlobeIcon className="h-3.5 w-3.5 text-blue-500" />
                    ) : (
                      <LockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isPublic
                      ? "Anyone with the link can use this template"
                      : "Only your organization can see this template"}
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  id="is-public"
                  onCheckedChange={setIsPublic}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                disabled={isSubmitting}
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isSubmitting || !name.trim()} type="submit">
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CopyIcon className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Browse Templates Menu Item
// ============================================================================

interface BrowseTemplatesMenuItemProps {
  onBoardCreated?: (boardId: string) => void;
  onSelect?: () => void;
}

// Map template tags to icons
function getTemplateIcon(tags: string[]) {
  const tagStr = tags.join(" ").toLowerCase();
  if (tagStr.includes("kitchen") || tagStr.includes("prep")) {
    return ChefHatIcon;
  }
  if (tagStr.includes("inventory") || tagStr.includes("order")) {
    return PackageIcon;
  }
  if (tagStr.includes("staff") || tagStr.includes("employee")) {
    return UsersIcon;
  }
  if (tagStr.includes("event") || tagStr.includes("weekly")) {
    return CalendarIcon;
  }
  return LayoutTemplateIcon;
}

export function BrowseTemplatesMenuItem({
  onBoardCreated,
  onSelect,
}: BrowseTemplatesMenuItemProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPublic, setShowPublic] = useState(true);
  const [selectedTemplate, setSelectedTemplate] =
    useState<BoardTemplate | null>(null);
  const [boardName, setBoardName] = useState("");
  const [includeProjections, setIncludeProjections] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isTogglingPublic, setIsTogglingPublic] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listBoardTemplates({ includePublic: showPublic });
      setTemplates(result);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  }, [showPublic]);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, loadTemplates]);

  const handleUseTemplate = async (template: BoardTemplate) => {
    setSelectedTemplate(template);
    setBoardName(`${template.name} - Board`);
    setIncludeProjections(true);
  };

  const handleCreateBoard = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    try {
      const result = await createBoardFromTemplate({
        templateId: selectedTemplate.id,
        boardName: boardName.trim(),
        includeProjections,
      });

      if (result.success && result.boardId) {
        toast.success("Board created from template");
        setOpen(false);
        onBoardCreated?.(result.boardId);
        router.push(`/command-board/${result.boardId}`);

        // Reset
        setSelectedTemplate(null);
        setBoardName("");
      } else {
        toast.error(result.error || "Failed to create board");
      }
    } catch {
      toast.error("Failed to create board");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTemplate = async (
    e: React.MouseEvent,
    templateId: string
  ) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;

    setIsDeleting(templateId);
    try {
      const result = await deleteBoardTemplate(templateId);
      if (result.success) {
        toast.success("Template deleted");
        await loadTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
      } else {
        toast.error(result.error || "Failed to delete template");
      }
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleTogglePublic = async (
    e: React.MouseEvent,
    template: BoardTemplate
  ) => {
    e.stopPropagation();
    setIsTogglingPublic(template.id);
    try {
      const result = await updateBoardTemplate({
        id: template.id,
        isPublic: !template.isPublic,
      });
      if (result.success) {
        toast.success(
          `Template is now ${template.isPublic ? "private" : "public"}`
        );
        await loadTemplates();
      } else {
        toast.error(result.error || "Failed to update template");
      }
    } catch {
      toast.error("Failed to update template");
    } finally {
      setIsTogglingPublic(null);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query) ||
      t.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const myTemplates = filteredTemplates.filter((t) => !t.isPublic);
  const publicTemplates = filteredTemplates.filter((t) => t.isPublic);

  return (
    <>
      <DropdownMenuItem
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
          onSelect?.();
        }}
      >
        <LayoutTemplateIcon className="mr-2 h-4 w-4" />
        Browse Templates
      </DropdownMenuItem>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Board Templates</DialogTitle>
            <DialogDescription>
              Choose a template to create a new board.
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate ? (
            <>
              {/* Create Board from Template */}
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  {(() => {
                    const Icon = getTemplateIcon(selectedTemplate.tags);
                    return (
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {selectedTemplate.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedTemplate.description || "No description"}
                    </p>
                  </div>
                  <Button
                    onClick={() => setSelectedTemplate(null)}
                    size="icon"
                    variant="ghost"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="board-name">Board Name</Label>
                  <Input
                    id="board-name"
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="Enter board name..."
                    value={boardName}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-projections">
                      Include Entities
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Copy all entities from the template to your new board
                    </p>
                  </div>
                  <Switch
                    checked={includeProjections}
                    id="include-projections"
                    onCheckedChange={setIncludeProjections}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  disabled={isCreating}
                  onClick={() => setSelectedTemplate(null)}
                  variant="outline"
                >
                  Back
                </Button>
                <Button
                  disabled={isCreating || !boardName.trim()}
                  onClick={handleCreateBoard}
                >
                  {isCreating ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Create Board
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* Search and Filter */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    value={searchQuery}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-public">Show Public</Label>
                  <Switch
                    checked={showPublic}
                    id="show-public"
                    onCheckedChange={setShowPublic}
                  />
                </div>
              </div>

              {/* Template List */}
              <div className="flex-1 overflow-y-auto -mx-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <LayoutTemplateIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No templates found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "Try a different search term"
                        : "Create your first template by saving a board"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myTemplates.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 px-1">
                          My Templates
                        </h3>
                        <div className="space-y-2">
                          {myTemplates.map((template) => {
                            const Icon = getTemplateIcon(template.tags);
                            return (
                              <div
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group"
                                key={template.id}
                                onClick={() => handleUseTemplate(template)}
                              >
                                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {template.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {template.description || "No description"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    className="h-8 w-8"
                                    disabled={
                                      isTogglingPublic === template.id ||
                                      template.isPublic
                                    }
                                    onClick={(e) =>
                                      handleTogglePublic(e, template)
                                    }
                                    size="icon"
                                    title={
                                      template.isPublic
                                        ? "Make private"
                                        : "Make public"
                                    }
                                    variant="ghost"
                                  >
                                    {template.isPublic ? (
                                      <GlobeIcon className="h-4 w-4 text-blue-500" />
                                    ) : (
                                      <LockIcon className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    className="h-8 w-8 text-destructive"
                                    disabled={isDeleting === template.id}
                                    onClick={(e) =>
                                      handleDeleteTemplate(e, template.id)
                                    }
                                    size="icon"
                                    title="Delete template"
                                    variant="ghost"
                                  >
                                    {isDeleting === template.id ? (
                                      <Loader2Icon className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <TrashIcon className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {publicTemplates.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-2 px-1 flex items-center gap-2">
                          Public Templates
                          <GlobeIcon className="h-3.5 w-3.5 text-blue-500" />
                        </h3>
                        <div className="space-y-2">
                          {publicTemplates.map((template) => {
                            const Icon = getTemplateIcon(template.tags);
                            return (
                              <div
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                key={template.id}
                                onClick={() => handleUseTemplate(template)}
                              >
                                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {template.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {template.description || "No description"}
                                  </p>
                                </div>
                                <GlobeIcon className="h-4 w-4 text-blue-500" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setOpen(false)} variant="outline">
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
