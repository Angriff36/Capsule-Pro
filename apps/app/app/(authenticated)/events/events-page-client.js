"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsPageClient = void 0;
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const event_editor_modal_1 = require("./event-editor-modal");
const EventsPageClient = () => {
  const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
  const handleSaveEvent = async (formData) => {
    try {
      await fetch("/events/api/create", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.error("Failed to save event:", error);
      throw error;
    }
  };
  return (
    <>
      <event_editor_modal_1.EventEditorModal
        onOpenChange={setIsModalOpen}
        onSave={handleSaveEvent}
        open={isModalOpen}
      />
      <button
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        <lucide_react_1.PlusIcon className="size-6" />
      </button>
    </>
  );
};
exports.EventsPageClient = EventsPageClient;
