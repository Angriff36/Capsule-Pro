/**
 * Employee Availability types
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday, 1=Monday, etc.

export interface EmployeeAvailability {
  created_at: Date;
  day_of_week: number;
  effective_from: Date; // YYYY-MM-DD
  effective_until: Date | null; // YYYY-MM-DD or null for ongoing
  employee_email: string;
  employee_first_name: string | null;
  employee_id: string;
  employee_last_name: string | null;
  employee_role: string;
  end_time: string; // HH:MM format
  id: string;
  is_available: boolean;
  start_time: string; // HH:MM format
  tenant_id: string;
  updated_at: Date;
}

export interface CreateAvailabilityInput {
  dayOfWeek: DayOfWeek;
  effectiveFrom?: string; // YYYY-MM-DD format, defaults to today
  effectiveUntil?: string | null; // YYYY-MM-DD format or null for ongoing
  employeeId: string;
  endTime: string; // HH:MM format (24-hour)
  isAvailable?: boolean; // defaults to true
  startTime: string; // HH:MM format (24-hour)
}

export interface UpdateAvailabilityInput {
  dayOfWeek?: DayOfWeek;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  endTime?: string;
  isAvailable?: boolean;
  startTime?: string;
}

export interface CreateBatchAvailabilityInput {
  effectiveFrom?: string; // YYYY-MM-DD format, defaults to today
  effectiveUntil?: string | null; // YYYY-MM-DD format or null for ongoing
  employeeId: string;
  patterns: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    isAvailable?: boolean;
  }>;
}

export interface AvailabilityFilters {
  dayOfWeek?: DayOfWeek;
  effectiveDate?: string; // Filter availability effective on this date
  employeeId?: string;
  isActive?: boolean; // Filter currently active availability
  limit?: number;
  page?: number;
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
  day_of_week: number;
  employee_email: string;
  employee_first_name: string | null;
  employee_id: string;
  employee_last_name: string | null;
  employee_role: string;
  end_time: string;
  is_available: boolean;
  start_time: string;
}

export interface EmployeesAvailabilityQuery {
  employeeIds?: string[]; // Specific employees to query
  endDate: string; // YYYY-MM-DD
  includeTimeOff?: boolean; // Also include time-off requests
  startDate: string; // YYYY-MM-DD
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
