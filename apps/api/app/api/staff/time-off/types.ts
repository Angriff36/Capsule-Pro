/**
 * Time-off request types
 */

export type TimeOffStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type TimeOffType =
  | "VACATION"
  | "SICK_LEAVE"
  | "PERSONAL_DAY"
  | "BEREAVEMENT"
  | "MATERNITY_LEAVE"
  | "PATERNITY_LEAVE"
  | "OTHER";

export type TimeOffRequest = {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  start_date: Date;
  end_date: Date;
  reason: string | null;
  status: TimeOffStatus;
  request_type: TimeOffType;
  created_at: Date;
  updated_at: Date;
  processed_at: Date | null;
  processed_by: string | null;
  processed_by_first_name: string | null;
  processed_by_last_name: string | null;
  rejection_reason: string | null;
};

export type CreateTimeOffRequestInput = {
  employeeId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  reason?: string;
  requestType: TimeOffType;
};

export type UpdateTimeOffStatusInput = {
  status: TimeOffStatus;
  rejectionReason?: string; // Required when status is REJECTED
};

export type TimeOffRequestFilters = {
  employeeId?: string;
  status?: TimeOffStatus;
  startDate?: string; // Filter requests starting on or after this date
  endDate?: string; // Filter requests ending on or before this date
  requestType?: TimeOffType;
  page?: number;
  limit?: number;
};

export type TimeOffRequestsListResponse = {
  requests: TimeOffRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
