"use client";

import { CalendarDaysIcon, MapPinIcon, UsersIcon, ClockIcon, TagIcon, ImagePlusIcon, UploadIcon, XIcon } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";

type EventImage = {
  id: string;
  file: File;
  url: string;
};

type EventEditorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: {
    id?: string;
    name?: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    capacity?: number;
    eventType?: string;
  };
  onSave: (data: FormData) => Promise<void>;
};

const eventTypes = [
  "Workshop",
  "Meetup",
  "Corporate Event",
  "Wedding",
  "Birthday Party",
  "Other",
] as const;

export const EventEditorModal = ({
  open,
  onOpenChange,
  event,
  onSave,
}: EventEditorModalProps) => {
  const [images, setImages] = useState<EventImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    const newImages: EventImage[] = files.map((file) => ({
      id: Math.random().toString(),
      file,
      url: URL.createObjectURL(file),
    }));

    setImages([...images, ...newImages]);
  };

  const handleRemoveImage = (id: string) => {
    const removed = images.find((img) => img.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    setImages(images.filter((img) => img.id !== id));
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            Fill in the event details below. Required fields are marked with an
            asterisk.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await onSave(formData);
            onOpenChange(false);
            toast.success("Event created successfully");
          }}
          className="flex flex-col gap-6"
        >
          {event?.id && (
            <input name="eventId" type="hidden" value={event.id} />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Event Name <span className="text-destructive">*</span>
              </Label>
              <Input
                defaultValue={event?.name ?? ""}
                id="name"
                name="name"
                placeholder="e.g., Summer Cooking Workshop"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                defaultValue={event?.eventType ?? "Workshop"}
                name="eventType"
              >
                <SelectTrigger id="eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                defaultValue={event?.date ?? ""}
                id="date"
                name="date"
                required
                type="date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                defaultValue={event?.time ?? ""}
                id="time"
                name="time"
                required
                type="time"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  defaultValue={event?.location ?? ""}
                  id="location"
                  name="location"
                  placeholder="e.g., 123 Main St, City, State"
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <div className="relative">
                <UsersIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  defaultValue={event?.capacity ?? ""}
                  id="capacity"
                  min="1"
                  name="capacity"
                  placeholder="e.g., 50"
                  required
                  type="number"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              defaultValue={event?.description ?? ""}
              id="description"
              name="description"
              placeholder="Describe your event..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Event Banner</Label>
            <div className="rounded-lg border-2 border-dashed p-4 text-center">
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={handleImageUpload}
                ref={fileInputRef}
                type="file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <UploadIcon className="mr-2 size-4" />
                Upload Banner
              </Button>
              <p className="text-muted-foreground mt-2 text-sm">
                Drag and drop or click to upload
              </p>
            </div>
            {images.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {images.map((image) => (
                  <div key={image.id} className="relative group">
                    <AspectRatio ratio={16 / 9}>
                      <Image
                        alt="Event banner"
                        className="h-full w-full rounded-lg object-cover"
                        fill
                        src={image.url}
                      />
                    </AspectRatio>
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        onClick={() => handleRemoveImage(image.id)}
                        size="icon"
                        type="button"
                        variant="destructive"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit">Create Event</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
