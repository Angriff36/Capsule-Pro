import type { TimeOffType } from "@api/staff/time-off/types";
interface TimeOffRequest {
  id?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  requestType?: TimeOffType;
}
interface TimeOffFormProps {
  request?: TimeOffRequest | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}
export declare function TimeOffForm({
  request,
  onSuccess,
  onCancel,
}: TimeOffFormProps): import("react").JSX.Element;
//# sourceMappingURL=time-off-form.d.ts.map
