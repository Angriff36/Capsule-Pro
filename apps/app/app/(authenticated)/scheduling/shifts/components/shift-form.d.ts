interface Shift {
  id?: string;
  schedule_id?: string;
  employee_id?: string;
  location_id?: string;
  shift_start?: string;
  shift_end?: string;
  role_during_shift?: string | null;
  notes?: string | null;
}
interface ShiftFormProps {
  shift?: Shift | null;
  scheduleId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}
export declare function ShiftForm({
  shift,
  scheduleId,
  onSuccess,
  onCancel,
}: ShiftFormProps): import("react").JSX.Element;
//# sourceMappingURL=shift-form.d.ts.map
