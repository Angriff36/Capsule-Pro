"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Highlighter, Plus, StickyNote, Tag, X } from "lucide-react";
import { type CSSProperties, useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createHighlight,
  createLabel,
  createNote,
  createRegion,
} from "../actions/extended-annotations";
import { RichTextEditor } from "./rich-text-editor";

// ============================================================================
// Types
// ============================================================================

interface AnnotationToolbarProps {
  boardId: string;
  onAnnotationAdded?: () => void;
  trigger?: React.ReactNode;
  position?: { x: number; y: number };
}

// ============================================================================
// Note Creation Dialog
// ============================================================================

interface NoteDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPosition?: { x: number; y: number };
  onSuccess?: () => void;
}

function NoteDialog({
  boardId,
  open,
  onOpenChange,
  initialPosition,
  onSuccess,
}: NoteDialogProps) {
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [tags, setTags] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createNote({
        boardId,
        content,
        position: initialPosition || { x: 100, y: 100 },
        priority,
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      });

      if (result.success) {
        toast.success("Note created");
        setContent("");
        setTags("");
        setPriority("medium");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to create note");
      }
    } catch (error) {
      toast.error("Failed to create note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="size-5" />
            Add Sticky Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note-content">Content</Label>
            <RichTextEditor
              minHeight="120px"
              onChange={(newValue) => setContent(newValue)}
              placeholder="Write your note here... Use **bold**, _italic_, `code`, and @mentions."
              value={content}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-priority">Priority</Label>
            <Select onValueChange={(v: any) => setPriority(v)} value={priority}>
              <SelectTrigger id="note-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-tags">Tags (comma-separated)</Label>
            <Input
              id="note-tags"
              onChange={(e) => setTags(e.target.value)}
              placeholder="todo, follow-up, question"
              value={tags}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!content.trim() || isSubmitting}
              onClick={handleSubmit}
              size="sm"
              type="button"
            >
              {isSubmitting ? "Creating..." : "Create Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Label Creation Dialog
// ============================================================================

interface LabelDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectionId?: string;
  onSuccess?: () => void;
}

function LabelDialog({
  boardId,
  open,
  onOpenChange,
  projectionId,
  onSuccess,
}: LabelDialogProps) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!(label.trim() && projectionId)) return;

    setIsSubmitting(true);
    try {
      const result = await createLabel({
        boardId,
        projectionId,
        label,
        color,
      });

      if (result.success) {
        toast.success("Label added");
        setLabel("");
        setColor("#3b82f6");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to add label");
      }
    } catch (error) {
      toast.error("Failed to add label");
    } finally {
      setIsSubmitting(false);
    }
  };

  const colorOptions = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#22c55e", label: "Green" },
    { value: "#f59e0b", label: "Yellow" },
    { value: "#ef4444", label: "Red" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#ec4899", label: "Pink" },
  ];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-5" />
            Add Label
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label-text">Label Text</Label>
            <Input
              id="label-text"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Priority, Blocked, Review"
              value={label}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((option) => (
                <button
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === option.value
                      ? "scale-110 border-foreground"
                      : "border-transparent"
                  }`}
                  key={option.value}
                  onClick={() => setColor(option.value)}
                  style={{ backgroundColor: option.value }}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!label.trim() || isSubmitting}
              onClick={handleSubmit}
              size="sm"
              type="button"
            >
              {isSubmitting ? "Adding..." : "Add Label"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Highlight Creation Dialog
// ============================================================================

interface HighlightDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectionId?: string;
  onSuccess?: () => void;
}

function HighlightDialog({
  boardId,
  open,
  onOpenChange,
  projectionId,
  onSuccess,
}: HighlightDialogProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!(content.trim() && projectionId)) return;

    setIsSubmitting(true);
    try {
      const result = await createHighlight({
        boardId,
        projectionId,
        content,
      });

      if (result.success) {
        toast.success("Highlight added");
        setContent("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to add highlight");
      }
    } catch (error) {
      toast.error("Failed to add highlight");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Highlighter className="size-5" />
            Add Highlight
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="highlight-content">Note</Label>
            <RichTextEditor
              minHeight="80px"
              onChange={(newValue) => setContent(newValue)}
              placeholder="What needs attention on this item?"
              value={content}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!content.trim() || isSubmitting}
              onClick={handleSubmit}
              size="sm"
              type="button"
            >
              {isSubmitting ? "Adding..." : "Add Highlight"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Region Creation Dialog
// ============================================================================

interface RegionDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPosition?: { x: number; y: number; width: number; height: number };
  onSuccess?: () => void;
}

function RegionDialog({
  boardId,
  open,
  onOpenChange,
  initialPosition,
  onSuccess,
}: RegionDialogProps) {
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!label.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createRegion({
        boardId,
        label,
        position: initialPosition || {
          x: 100,
          y: 100,
          width: 300,
          height: 200,
        },
      });

      if (result.success) {
        toast.success("Region created");
        setLabel("");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to create region");
      }
    } catch (error) {
      toast.error("Failed to create region");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-5 items-center justify-center rounded border border-border bg-muted">
              <div className="size-2 rounded-full bg-foreground" />
            </div>
            Add Region
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="region-label">Region Name</Label>
            <Input
              id="region-label"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., QA Area, Design Zone"
              value={label}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!label.trim() || isSubmitting}
              onClick={handleSubmit}
              size="sm"
              type="button"
            >
              {isSubmitting ? "Creating..." : "Create Region"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Annotation Toolbar
// ============================================================================

export function AnnotationToolbar({
  boardId,
  onAnnotationAdded,
  trigger,
  position,
}: AnnotationToolbarProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  const handleSuccess = useCallback(() => {
    onAnnotationAdded?.();
  }, [onAnnotationAdded]);

  const triggerNode = trigger || (
    <Button className="gap-1.5" size="sm" type="button">
      <Plus className="size-4" />
      Add Annotation
    </Button>
  );

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>{triggerNode}</PopoverTrigger>
        <PopoverContent align="start" className="w-48 p-2">
          <div className="grid grid-cols-2 gap-1">
            <Button
              className="justify-start gap-2"
              onClick={() => setNoteOpen(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <StickyNote className="size-4" />
              <span>Note</span>
            </Button>
            <Button
              className="justify-start gap-2"
              onClick={() => setLabelOpen(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Tag className="size-4" />
              <span>Label</span>
            </Button>
            <Button
              className="justify-start gap-2"
              onClick={() => setHighlightOpen(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Highlighter className="size-4" />
              <span>Highlight</span>
            </Button>
            <Button
              className="justify-start gap-2"
              onClick={() => setRegionOpen(true)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <div className="flex size-4 items-center justify-center rounded border border-border bg-muted">
                <div className="size-2 rounded-full bg-foreground" />
              </div>
              <span>Region</span>
            </Button>
          </div>
          <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
            Add contextual notes, labels, and highlights to your board.
          </div>
        </PopoverContent>
      </Popover>

      <NoteDialog
        boardId={boardId}
        initialPosition={position}
        onOpenChange={setNoteOpen}
        onSuccess={handleSuccess}
        open={noteOpen}
      />

      <LabelDialog
        boardId={boardId}
        onOpenChange={setLabelOpen}
        onSuccess={handleSuccess}
        open={labelOpen}
      />

      <HighlightDialog
        boardId={boardId}
        onOpenChange={setHighlightOpen}
        onSuccess={handleSuccess}
        open={highlightOpen}
      />

      <RegionDialog
        boardId={boardId}
        initialPosition={
          position ? { ...position, width: 300, height: 200 } : undefined
        }
        onOpenChange={setRegionOpen}
        onSuccess={handleSuccess}
        open={regionOpen}
      />
    </>
  );
}

// ============================================================================
// Floating Annotation Button (for board canvas)
// ============================================================================

interface FloatingAnnotationButtonProps {
  boardId: string;
  style?: CSSProperties;
  onAnnotationAdded?: () => void;
  onCreateNote?: (position: { x: number; y: number }) => void;
}

export function FloatingAnnotationButton({
  boardId,
  style,
  onAnnotationAdded,
  onCreateNote,
}: FloatingAnnotationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCreateNote = useCallback(() => {
    setIsOpen(false);
    onCreateNote?.({ x: 100, y: 100 });
  }, [onCreateNote]);

  return (
    <div
      className="absolute bottom-4 right-4 z-10 flex flex-col gap-2"
      style={style}
    >
      {isOpen && (
        <div className="flex flex-col gap-1 rounded-lg border bg-background p-1 shadow-md">
          <button
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
            onClick={handleCreateNote}
            type="button"
          >
            <StickyNote className="size-4" />
            Sticky Note
          </button>
          <AnnotationToolbar
            boardId={boardId}
            onAnnotationAdded={onAnnotationAdded}
            trigger={
              <button
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                type="button"
              >
                <Tag className="size-4" />
                Label Entity
              </button>
            }
          />
          <AnnotationToolbar
            boardId={boardId}
            onAnnotationAdded={onAnnotationAdded}
            trigger={
              <button
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                type="button"
              >
                <Highlighter className="size-4" />
                Highlight
              </button>
            }
          />
        </div>
      )}
      <Button
        className="h-10 w-10 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        type="button"
      >
        {isOpen ? <X className="size-5" /> : <Plus className="size-5" />}
      </Button>
    </div>
  );
}
