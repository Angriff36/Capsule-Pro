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
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { CopyIcon, GlobeIcon, Loader2Icon, LockIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createTemplateFromBoard } from "../actions/templates";

interface SaveAsTemplateDialogProps {
  boardId: string;
  boardName?: string;
  boardDescription?: string | null;
  onTemplateCreated?: () => void;
}

export function SaveAsTemplateDialog({
  boardId,
  boardName,
  boardDescription,
  onTemplateCreated,
}: SaveAsTemplateDialogProps) {
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
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start" variant="ghost">
          <CopyIcon className="mr-2 h-4 w-4" />
          Save as Template
        </Button>
      </DialogTrigger>
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
  );
}
