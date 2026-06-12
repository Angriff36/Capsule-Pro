/**
 * Employee availability types used by the app scheduling UI/actions.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface EmployeeAvailability {
  created_at: Date;
  dayOfWeek: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  employeeEmail: string;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  endTime: string;
  id: string;
  isAvailable: boolean;
  startTime: string;
  tenant_id: string;
  updated_at: Date;
}

export interface CreateAvailabilityInput {
  dayOfWeek: DayOfWeek;
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  employeeId: string;
  endTime: string;
  isAvailable?: boolean;
  startTime: string;
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
  effectiveFrom?: string;
  effectiveUntil?: string | null;
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
  effectiveDate?: string;
  employeeId?: string;
  isActive?: boolean;
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
  dayOfWeek: number;
  employeeEmail: string;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  endTime: string;
  isAvailable: boolean;
  startTime: string;
}

export interface EmployeesAvailabilityQuery {
  employeeIds?: string[];
  endDate: string;
  includeTimeOff?: boolean;
  startDate: string;
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
