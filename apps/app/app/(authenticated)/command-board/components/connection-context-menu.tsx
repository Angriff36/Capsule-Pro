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
import { useState } from "react";
import { deleteConnection, updateConnection } from "../actions/connections";
import { RelationshipConfig, RelationshipType } from "../types";
import type { CardConnection } from "../types";

interface ConnectionContextMenuProps {
  connection: CardConnection;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ConnectionContextMenu({
  connection,
  onEdit,
  onDelete,
}: ConnectionContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [relationshipType, setRelationshipType] = useState<RelationshipType>(
    connection.relationshipType
  );
  const [label, setLabel] = useState(connection.label ?? "");
  const [visible, setVisible] = useState(connection.visible);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setError(null);

    const result = await updateConnection({
      id: connection.id,
      relationshipType,
      label: label || undefined,
      visible,
    });

    if (result.success) {
      setShowEditDialog(false);
      onEdit?.();
    } else {
      setError(result.error || "Failed to update connection");
    }

    setIsUpdating(false);
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    setError(null);

    const result = await deleteConnection(connection.id);

    if (result.success) {
      setShowDeleteDialog(false);
      setIsOpen(false);
      onDelete?.();
    } else {
      setError(result.error || "Failed to delete connection");
    }

    setIsUpdating(false);
  };

  const currentConfig = RelationshipConfig[relationshipType];

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1">
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setShowEditDialog(true);
            }}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
            Edit Connection
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setShowDeleteDialog(true);
            }}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Delete Connection
          </button>
        </PopoverContent>
      </Popover>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>
              Update the relationship type or add a custom label.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Relationship Type */}
            <div className="grid gap-2">
              <Label htmlFor="edit-relationship-type">Relationship Type</Label>
              <Select
                value={relationshipType}
                onValueChange={(value) =>
                  setRelationshipType(value as RelationshipType)
                }
              >
                <SelectTrigger id="edit-relationship-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RelationshipConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Label */}
            <div className="grid gap-2">
              <Label htmlFor="edit-connection-label">Label (Optional)</Label>
              <Input
                id="edit-connection-label"
                placeholder="Custom label for the connection"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default: {currentConfig.label}
              </p>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center gap-2">
              <input
                checked={visible}
                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2 focus:ring-offset-0"
                id="edit-visible"
                onChange={(e) => setVisible(e.target.checked)}
                type="checkbox"
              />
              <Label htmlFor="edit-visible" className="cursor-pointer">
                Visible on board
              </Label>
            </div>

            {/* Error Message */}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this connection? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isUpdating}
            >
              {isUpdating ? "Deleting..." : "Delete Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
