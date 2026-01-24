type TimeEntry = {
  id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  employee_number: string | null;
  location_id: string | null;
  location_name: string | null;
  shift_id: string | null;
  shift_start: Date | null;
  shift_end: Date | null;
  clock_in: Date;
  clock_out: Date | null;
  break_minutes: number;
  notes: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  approver_first_name: string | null;
  approver_last_name: string | null;
  scheduled_hours: number | null;
  actual_hours: number | null;
  exception_type: string | null;
  hourly_rate: number | null;
  total_cost: number | null;
  created_at: Date;
  updated_at: Date;
};
type TimecardDetailModalProps = {
  timeEntry: TimeEntry | null;
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onEditRequest: (
    reason: string,
    requestedChanges?: {
      requestedClockIn?: string;
      requestedClockOut?: string;
      requestedBreakMinutes?: number;
    }
  ) => void;
  onFlagException: (type: string, notes: string) => void;
};
export default function TimecardDetailModal({
  timeEntry,
  open,
  onClose,
  onApprove,
  onEditRequest,
  onFlagException,
}: TimecardDetailModalProps): import("react").JSX.Element | null;
//# sourceMappingURL=timecard-detail-modal.d.ts.map
