interface AvailabilityFormProps {
  availability?: {
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
  employeeOptions?: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
  }>;
  locationOptions?: Array<{
    id: string;
    name: string;
  }>;
  onCancel: () => void;
  onSuccess: () => void;
}
export declare function AvailabilityForm({
  availability,
  employeeOptions,
  locationOptions,
  onCancel,
  onSuccess,
}: AvailabilityFormProps): import("react").JSX.Element;
//# sourceMappingURL=availability-form.d.ts.map
