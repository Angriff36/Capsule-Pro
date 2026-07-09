"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import { Textarea } from "@repo/design-system/components/ui/textarea";

interface PrepItemNoteSheetProps {
  isSaving: boolean;
  itemName: string | undefined;
  noteText: string;
  onCancel: () => void;
  onNoteTextChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  open: boolean;
}

export function PrepItemNoteSheet({
  open,
  onOpenChange,
  itemName,
  noteText,
  onNoteTextChange,
  onCancel,
  onSave,
  isSaving,
}: PrepItemNoteSheetProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex flex-col" side="bottom">
        <SheetHeader>
          <SheetTitle>Add Note</SheetTitle>
          <SheetDescription>
            {itemName} - Add prep notes or flag issues
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 py-4">
          <Textarea
            className="min-h-[120px] text-lg"
            onChange={(e) => onNoteTextChange(e.target.value)}
            placeholder="Enter prep notes or flag an issue..."
            value={noteText}
          />
        </div>
        <SheetFooter className="flex-row gap-2">
          <Button className="flex-1" onClick={onCancel} variant="outline">
            Cancel
          </Button>
          <Button className="flex-1" disabled={isSaving} onClick={onSave}>
            {isSaving ? "Saving..." : "Save Note"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
