/**
 * Get all shifts with optional filters
 */
export declare function getShifts(params: {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  locationId?: string;
  role?: string;
  page?: number;
  limit?: number;
}): Promise<{
  shifts: {
    id: string;
    schedule_id: string;
    employee_id: string;
    employee_first_name: string | null;
    employee_last_name: string | null;
    employee_email: string;
    employee_role: string;
    location_id: string;
    location_name: string;
    shift_start: Date;
    shift_end: Date;
    role_during_shift: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>;
/**
 * Get a single shift by ID
 */
export declare function getShift(shiftId: string): Promise<{
  shift: {
    id: string;
    schedule_id: string;
    employee_id: string;
    employee_first_name: string | null;
    employee_last_name: string | null;
    employee_email: string;
    employee_role: string;
    location_id: string;
    location_name: string;
    shift_start: Date;
    shift_end: Date;
    role_during_shift: string | null;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  };
}>;
/**
 * Get available employees for a shift time slot
 */
export declare function getAvailableEmployees(params: {
  shiftStart: string;
  shiftEnd: string;
  excludeShiftId?: string;
  locationId?: string;
  requiredRole?: string;
}): Promise<{
  employees: {
    hasConflictingShift: boolean;
    conflictingShifts: {
      id: string;
      shiftStart: Date;
      shiftEnd: Date;
      locationName: string;
    }[];
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
    is_active: boolean;
    has_conflicting_shift: boolean;
    conflicting_shifts: Array<{
      id: string;
      shift_start: Date;
      shift_end: Date;
      location_name: string;
    }>;
  }[];
}>;
/**
 * Create a new shift
 */
export declare function createShift(formData: FormData): Promise<{
  shift: {
    id: string;
    employeeId: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    notes: string | null;
    locationId: string;
    scheduleId: string;
    shift_start: Date;
    shift_end: Date;
    role_during_shift: string | null;
  };
}>;
/**
 * Update an existing shift
 */
export declare function updateShift(
  shiftId: string,
  formData: FormData
): Promise<{
  shift: {
    id: string;
    employeeId: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    notes: string | null;
    locationId: string;
    scheduleId: string;
    shift_start: Date;
    shift_end: Date;
    role_during_shift: string | null;
  };
}>;
/**
 * Delete a shift
 */
export declare function deleteShift(shiftId: string): Promise<{
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
 * Get all locations for dropdown
 */
export declare function getLocations(): Promise<{
  locations: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
}>;
/**
 * Get all schedules for dropdown
 */
export declare function getSchedules(): Promise<{
  schedules: {
    id: string;
    schedule_date: Date;
    status: string;
  }[];
}>;
//# sourceMappingURL=actions.d.ts.map
