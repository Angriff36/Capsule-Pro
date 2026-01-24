interface Shift {
  id: string;
  schedule_id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  location_id: string;
  location_name: string;
  shift_start: Date;
  shift_end: Date;
  role_during_shift: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
interface ShiftDetailModalProps {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
  onDelete?: () => void;
}
export declare function ShiftDetailModal({
  open,
  onClose,
  shift,
  onDelete,
}: ShiftDetailModalProps): import("react").JSX.Element | null;
//# sourceMappingURL=shift-detail-modal.d.ts.map
