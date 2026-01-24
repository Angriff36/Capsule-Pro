import type {
  CreateTimeOffRequestInput,
  TimeOffRequest,
  TimeOffRequestsListResponse,
  TimeOffStatus,
  TimeOffType,
  UpdateTimeOffStatusInput,
} from "@api/staff/time-off/types";
/**
 * Get time-off requests with optional filters
 */
export declare function getTimeOffRequests(params: {
  employeeId?: string;
  status?: TimeOffStatus;
  startDate?: string;
  endDate?: string;
  requestType?: TimeOffType;
  page?: number;
  limit?: number;
}): Promise<TimeOffRequestsListResponse>;
/**
 * Get a single time-off request by ID
 */
export declare function getTimeOffRequestById(requestId: string): Promise<{
  request: TimeOffRequest;
}>;
/**
 * Create a new time-off request
 */
export declare function createTimeOffRequest(
  input: CreateTimeOffRequestInput
): Promise<{
  request: TimeOffRequest;
}>;
/**
 * Update time-off request status (approve/reject/cancel)
 */
export declare function updateTimeOffStatus(
  requestId: string,
  input: UpdateTimeOffStatusInput
): Promise<{
  request: TimeOffRequest;
}>;
/**
 * Delete a time-off request (soft delete)
 */
export declare function deleteTimeOffRequest(requestId: string): Promise<{
  success: boolean;
}>;
/**
 * Get all employees for dropdown
 */
export declare function getEmployees(): Promise<{
  employees: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_active: boolean;
  }[];
}>;
/**
 * Get all time-off types for dropdown
 */
export declare const timeOffTypes: TimeOffType[];
//# sourceMappingURL=actions.d.ts.map
