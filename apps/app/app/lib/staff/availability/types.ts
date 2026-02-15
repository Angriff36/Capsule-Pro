/**
 * Employee availability types used by the app scheduling UI/actions.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface EmployeeAvailability {
  id: string;
  tenant_id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  effective_from: Date;
  effective_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAvailabilityInput {
  employeeId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
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
  effectiveFrom?: string;
  effectiveUntil?: string | null;
}

export interface AvailabilityFilters {
  employeeId?: string;
  dayOfWeek?: DayOfWeek;
  effectiveDate?: string;
  isActive?: boolean;
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
  employeeIds?: string[];
  startDate: string;
  endDate: string;
  includeTimeOff?: boolean;
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
