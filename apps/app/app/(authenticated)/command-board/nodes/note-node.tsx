"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Edit,
  Loader2,
  MessageSquare,
  Pin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import type { BoardAnnotation } from "../types/board";

// ============================================================================
// Types
// ============================================================================

export interface NoteNodeData extends Record<string, unknown> {
  annotation: BoardAnnotation;
  onUpdate?: (annotationId: string, updates: Partial<BoardAnnotation>) => void;
  onDelete?: (annotationId: string) => void;
  onAddComment?: (annotationId: string, content: string) => void;
  onToggleResolve?: (annotationId: string) => void;
}

export type NoteNode = Node<NoteNodeData, "note">;

const PRIORITY_COLORS = {
  low: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  medium: {
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-800",
    badge:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  high: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
} as const;

// ============================================================================
// Comment Thread Component
// ============================================================================

interface CommentThreadProps {
  annotation: BoardAnnotation;
  onAddComment?: (annotationId: string, content: string) => void;
  onClose?: () => void;
}

function CommentThread({
  annotation,
  onAddComment,
  onClose,
}: CommentThreadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comments = annotation.comments || [];
  const commentCount = comments.length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment?.(annotation.id, newComment.trim());
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
            commentCount > 0 ? "text-foreground" : "text-muted-foreground"
          }`}
          type="button"
        >
          <MessageSquare className="size-3.5" />
          <span>{commentCount}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-50 w-80 p-3" side="left">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Comments</h4>
          <button
            className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-60 space-y-3 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              No comments yet. Start the discussion!
            </p>
          ) : (
            comments.map((comment) => (
              <div
                className="rounded-md border border-border/50 bg-muted/30 p-2"
                key={comment.id}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {comment.authorName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-xs">
                  {comment.content}
                </p>
                {comment.mentions && comment.mentions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {comment.mentions.map((mention, i) => (
                      <span
                        className="rounded bg-primary/10 px-1 py-0.5 text-xs text-primary"
                        key={i}
                      >
                        @{mention.userName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
          <Textarea
            className="min-h-16 text-xs"
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            value={newComment}
          />
          <div className="flex justify-end gap-2">
            <Button
              className="h-7 text-xs"
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Plus className="size-3" />
                  Add Comment
                </>
              )}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Note Node Component
// ============================================================================

export function NoteNode({ data, selected }: NodeProps<NoteNodeData>) {
  const { annotation } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const priority = annotation.priority || "medium";
  const priorityStyles = PRIORITY_COLORS[priority];
  const comments = annotation.comments || [];
  const unresolvedCount = comments.filter((c) => !c.resolved).length;
  const isResolved = annotation.resolved;

  const handleSave = async () => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    try {
      await data.onUpdate?.(annotation.id, { content: editContent });
      setIsEditing(false);
      toast.success("Note updated");
    } catch (error) {
      toast.error("Failed to update note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note?")) return;
    try {
      await data.onDelete?.(annotation.id);
      toast.success("Note deleted");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleToggleResolve = async () => {
    try {
      await data.onToggleResolve?.(annotation.id);
      toast.success(isResolved ? "Note reopened" : "Note resolved");
    } catch (error) {
      toast.error("Failed to update note");
    }
  };

  const content = annotation.content || "";

  return (
    <div
      className={`relative transition-shadow ${selected ? "shadow-lg" : ""}`}
      style={{
        width: annotation.position?.width || 200,
        height: annotation.position?.height || "auto",
      }}
    >
      {/* Invisible handles for potential connections */}
      <Handle className="!opacity-0" position={Position.Top} type="target" />
      <Handle className="!opacity-0" position={Position.Bottom} type="source" />

      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className={`group relative overflow-hidden rounded-lg border-2 shadow-sm transition-all ${priorityStyles.bg} ${priorityStyles.border} ${
          isResolved ? "opacity-60" : ""
        }`}
        initial={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
      >
        {/* Header bar */}
        <div
          className={`flex items-center justify-between border-b px-2 py-1.5 ${priorityStyles.border}`}
        >
          <div className="flex items-center gap-1.5">
            {isResolved && (
              <Check className="size-3.5 text-green-600 dark:text-green-400" />
            )}
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles.badge}`}
            >
              {priority}
            </span>
            {annotation.authorName && (
              <span className="text-xs text-muted-foreground">
                {annotation.authorName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              {isExpanded ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </Button>
            <Button
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(!isEditing)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Edit className="size-3" />
            </Button>
            <Button
              className="h-6 w-6 p-0 text-destructive"
              onClick={handleDelete}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        {/* Content area */}
        {isExpanded && (
          <div className="p-3">
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  className="min-h-24 resize-none text-sm"
                  onChange={(e) => setEditContent(e.target.value)}
                  value={editContent}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    className="h-7 text-xs"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(annotation.content || "");
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="h-7 text-xs"
                    disabled={isSubmitting || !editContent.trim()}
                    onClick={handleSave}
                    size="sm"
                    type="button"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap break-words text-sm">
                  {content}
                </p>
              </div>
            )}

            {/* Tags */}
            {annotation.tags && annotation.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {annotation.tags.map((tag, i) => (
                  <span
                    className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/5"
                    key={i}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer bar with actions */}
        <div
          className={`flex items-center justify-between border-t px-2 py-1.5 ${priorityStyles.border}`}
        >
          <CommentThread
            annotation={annotation}
            onAddComment={data.onAddComment}
          />
          <div className="flex items-center gap-1">
            {unresolvedCount > 0 && (
              <span className="mr-1 text-xs text-muted-foreground">
                {unresolvedCount} unresolved
              </span>
            )}
            <Button
              className="h-6 gap-1 px-2 text-xs"
              onClick={handleToggleResolve}
              size="sm"
              type="button"
              variant={isResolved ? "outline" : "ghost"}
            >
              <Archive className="size-3" />
              {isResolved ? "Reopen" : "Resolve"}
            </Button>
          </div>
        </div>

        {/* Pin indicator for pinned notes */}
        {annotation.position && (
          <div className="absolute -top-1 -right-1">
            <Pin className="size-4 fill-foreground text-foreground opacity-50" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
