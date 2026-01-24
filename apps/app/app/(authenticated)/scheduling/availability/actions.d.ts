import type { AvailabilityFilters } from "@api/staff/availability/types";
/**
 * Get all availability records with optional filters
 */
export declare function getAvailability(params?: AvailabilityFilters): Promise<{
  availability: {
    id: string;
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
  }[];
  pagination: {
    page: any;
    limit: any;
    total: number;
    totalPages: number;
  };
}>;
/**
 * Get a single availability record by ID
 */
export declare function getAvailabilityById(availabilityId: string): Promise<{
  availability: {
    id: string;
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
  };
}>;
/**
 * Create a new availability record
 */
export declare function createAvailability(formData: FormData): Promise<{
  availability: {
    id: string;
    employee_id: string;
    updated_at: Date;
    deleted_at: Date | null;
    created_at: Date;
    tenant_id: string;
    day_of_week: number;
    start_time: Date;
    end_time: Date;
    is_available: boolean;
    effective_from: Date;
    effective_until: Date | null;
  };
}>;
/**
 * Update an existing availability record
 */
export declare function updateAvailability(
  availabilityId: string,
  formData: FormData
): Promise<{
  availability: {
    id: string;
    employee_id: string;
    updated_at: Date;
    deleted_at: Date | null;
    created_at: Date;
    tenant_id: string;
    day_of_week: number;
    start_time: Date;
    end_time: Date;
    is_available: boolean;
    effective_from: Date;
    effective_until: Date | null;
  };
}>;
/**
 * Delete (soft delete) an availability record
 */
export declare function deleteAvailability(availabilityId: string): Promise<{
  success: boolean;
}>;
/**
 * Create batch availability records (recurring weekly patterns)
 */
export declare function createBatchAvailability(formData: FormData): Promise<{
  availability: any[];
}>;
/**
 * Get employee availability for scheduling (date range with time-off integration)
 */
export declare function getEmployeeAvailability(params: {
  employeeIds?: string[];
  startDate: string;
  endDate: string;
  includeTimeOff?: boolean;
}): Promise<{
  employees: {
    employeeId: any;
    employee_first_name: any;
    employee_last_name: any;
    employee_email: any;
    employee_role: any;
    availability: any;
    time_off_requests: any[] | undefined;
  }[];
}>;
/**
 * Get all active employees for dropdown
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
//# sourceMappingURL=actions.d.ts.map
