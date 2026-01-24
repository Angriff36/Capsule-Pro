import type { Event } from "@repo/database";
type EventFormProps = {
  event?: Event | null;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};
export declare const EventForm: ({
  event,
  action,
  submitLabel,
}: EventFormProps) => import("react").JSX.Element;
//# sourceMappingURL=event-form.d.ts.map
