/**
 * Time-off request types used by the app scheduling UI/actions.
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

export interface TimeOffRequest {
  created_at: Date;
  employeeEmail: string;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  end_date: Date;
  id: string;
  processed_at: Date | null;
  processed_by: string | null;
  processed_by_first_name: string | null;
  processed_by_last_name: string | null;
  reason: string | null;
  rejection_reason: string | null;
  request_type: TimeOffType;
  start_date: Date;
  status: TimeOffStatus;
  tenant_id: string;
  updated_at: Date;
}

export interface CreateTimeOffRequestInput {
  employeeId: string;
  endDate: string;
  reason?: string;
  requestType: TimeOffType;
  startDate: string;
}

export interface UpdateTimeOffStatusInput {
  rejectionReason?: string;
  status: TimeOffStatus;
}

export interface TimeOffRequestFilters {
  employeeId?: string;
  endDate?: string;
  limit?: number;
  page?: number;
  requestType?: TimeOffType;
  startDate?: string;
  status?: TimeOffStatus;
}

export interface TimeOffRequestsListResponse {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  requests: TimeOffRequest[];
}
