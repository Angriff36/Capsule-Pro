"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEditorModal = void 0;
const aspect_ratio_1 = require("@repo/design-system/components/ui/aspect-ratio");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const image_1 = __importDefault(require("next/image"));
const react_1 = require("react");
const sonner_1 = require("sonner");
const eventTypes = [
  "Workshop",
  "Meetup",
  "Corporate Event",
  "Wedding",
  "Birthday Party",
  "Other",
];
const EventEditorModal = ({ open, onOpenChange, event, onSave }) => {
  const [images, setImages] = (0, react_1.useState)([]);
  const fileInputRef = (0, react_1.useRef)(null);
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }
    const newImages = files.map((file) => ({
      id: Math.random().toString(),
      file,
      url: URL.createObjectURL(file),
    }));
    setImages([...images, ...newImages]);
  };
  const handleRemoveImage = (id) => {
    const removed = images.find((img) => img.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    setImages(images.filter((img) => img.id !== id));
  };
  return (
    <dialog_1.Dialog onOpenChange={onOpenChange} open={open}>
      <dialog_1.DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>
            {event?.id ? "Edit Event" : "Create Event"}
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Fill in the event details below. Required fields are marked with an
            asterisk.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <form
          action={async (formData) => {
            await onSave(formData);
            onOpenChange(false);
            sonner_1.toast.success("Event created successfully");
          }}
          className="flex flex-col gap-6"
        >
          {event?.id && <input name="eventId" type="hidden" value={event.id} />}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label_1.Label htmlFor="name">
                Event Name <span className="text-destructive">*</span>
              </label_1.Label>
              <input_1.Input
                defaultValue={event?.name ?? ""}
                id="name"
                name="name"
                placeholder="e.g., Summer Cooking Workshop"
                required
              />
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="eventType">Event Type</label_1.Label>
              <select_1.Select
                defaultValue={event?.eventType ?? "Workshop"}
                name="eventType"
              >
                <select_1.SelectTrigger id="eventType">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {eventTypes.map((type) => (
                    <select_1.SelectItem key={type} value={type}>
                      {type}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="date">Date</label_1.Label>
              <input_1.Input
                defaultValue={event?.date ?? ""}
                id="date"
                name="date"
                required
                type="date"
              />
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="time">Time</label_1.Label>
              <input_1.Input
                defaultValue={event?.time ?? ""}
                id="time"
                name="time"
                required
                type="time"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label_1.Label htmlFor="location">Location</label_1.Label>
              <div className="relative">
                <lucide_react_1.MapPinIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input_1.Input
                  className="pl-10"
                  defaultValue={event?.location ?? ""}
                  id="location"
                  name="location"
                  placeholder="e.g., 123 Main St, City, State"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="capacity">Capacity</label_1.Label>
              <div className="relative">
                <lucide_react_1.UsersIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input_1.Input
                  className="pl-10"
                  defaultValue={event?.capacity ?? ""}
                  id="capacity"
                  min="1"
                  name="capacity"
                  placeholder="e.g., 50"
                  required
                  type="number"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="description">Description</label_1.Label>
            <textarea_1.Textarea
              defaultValue={event?.description ?? ""}
              id="description"
              name="description"
              placeholder="Describe your event..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <label_1.Label>Event Banner</label_1.Label>
            <div className="rounded-lg border-2 border-dashed p-4 text-center">
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={handleImageUpload}
                ref={fileInputRef}
                type="file"
              />
              <button_1.Button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <lucide_react_1.UploadIcon className="mr-2 size-4" />
                Upload Banner
              </button_1.Button>
              <p className="text-muted-foreground mt-2 text-sm">
                Drag and drop or click to upload
              </p>
            </div>
            {images.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {images.map((image) => (
                  <div className="relative group" key={image.id}>
                    <aspect_ratio_1.AspectRatio ratio={16 / 9}>
                      <image_1.default
                        alt="Event banner"
                        className="h-full w-full rounded-lg object-cover"
                        fill
                        src={image.url}
                      />
                    </aspect_ratio_1.AspectRatio>
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button_1.Button
                        onClick={() => handleRemoveImage(image.id)}
                        size="icon"
                        type="button"
                        variant="destructive"
                      >
                        <lucide_react_1.XIcon className="size-4" />
                      </button_1.Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button_1.Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button type="submit">Create Event</button_1.Button>
          </div>
        </form>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
};
exports.EventEditorModal = EventEditorModal;
