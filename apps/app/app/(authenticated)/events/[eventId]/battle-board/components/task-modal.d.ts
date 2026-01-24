import type { StaffMember, TimelineTask } from "../types";
type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventDate: Date;
  staff: StaffMember[];
  onTaskCreated?: (task: TimelineTask) => void;
};
export declare function TaskModal({
  isOpen,
  onClose,
  eventId,
  eventDate,
  staff,
  onTaskCreated,
}: TaskModalProps): import("react").JSX.Element;
//# sourceMappingURL=task-modal.d.ts.map
