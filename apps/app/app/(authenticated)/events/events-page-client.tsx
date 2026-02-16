"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createEvent } from "./actions";
import { EventEditorModal } from "./event-editor-modal";

export const EventsPageClient = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveEvent = async (formData: FormData) => {
    try {
      await createEvent(formData);
      toast.success("Event created successfully");
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error("Failed to save event. Please try again.");
      throw error;
    }
  };

  return (
    <>
      <EventEditorModal
        onOpenChange={setIsModalOpen}
        onSave={handleSaveEvent}
        open={isModalOpen}
      />
      <button
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        <PlusIcon className="size-6" />
      </button>
    </>
  );
};
