/**
 * Employee Availability types
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 1=Monday, etc.

export interface EmployeeAvailability {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  day_of_week: number;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
  effective_from: Date; // YYYY-MM-DD
  effective_until: Date | null; // YYYY-MM-DD or null for ongoing
  created_at: Date;
  updated_at: Date;
}

export interface CreateAvailabilityInput {
  employeeId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM format (24-hour)
  endTime: string; // HH:MM format (24-hour)
  isAvailable?: boolean; // defaults to true
  effectiveFrom?: string; // YYYY-MM-DD format, defaults to today
  effectiveUntil?: string | null; // YYYY-MM-DD format or null for ongoing
}

export interface UpdateAvailabilityInput {
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
}

export interface CreateBatchAvailabilityInput {
  employeeId: string;
  patterns: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }>;
  effectiveFrom?: string; // YYYY-MM-DD format, defaults to today
  effectiveUntil?: string | null; // YYYY-MM-DD format or null for ongoing
}

export interface AvailabilityFilters {
  employeeId?: string;
  dayOfWeek?: DayOfWeek;
  effectiveDate?: string; // Filter availability effective on this date
  isActive?: boolean; // Filter currently active availability
  page?: number;
  limit?: number;
}

export interface AvailabilityListResponse {
  availability: EmployeeAvailability[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmployeeAvailabilityForDate {
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  is_available: boolean;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface EmployeesAvailabilityQuery {
  employeeIds?: string[]; // Specific employees to query
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  includeTimeOff?: boolean; // Also include time-off requests
}

export interface EmployeeAvailabilityWithTimeOff
  extends EmployeeAvailabilityForDate {
  time_off_requests?: Array<{
    id: string;
    start_date: Date;
    end_date: Date;
    status: string;
  }>;
}
