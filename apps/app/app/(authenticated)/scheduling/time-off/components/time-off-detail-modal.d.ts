import type { TimeOffRequest } from "@api/staff/time-off/types";
interface TimeOffDetailModalProps {
  open: boolean;
  onClose: () => void;
  timeOffRequest: TimeOffRequest | null;
  onDelete?: () => void;
}
export declare function TimeOffDetailModal({
  open,
  onClose,
  timeOffRequest,
  onDelete,
}: TimeOffDetailModalProps): import("react").JSX.Element | null;
//# sourceMappingURL=time-off-detail-modal.d.ts.map
