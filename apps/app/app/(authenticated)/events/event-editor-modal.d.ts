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
export declare const EventEditorModal: ({
  open,
  onOpenChange,
  event,
  onSave,
}: EventEditorModalProps) => import("react").JSX.Element;
//# sourceMappingURL=event-editor-modal.d.ts.map
