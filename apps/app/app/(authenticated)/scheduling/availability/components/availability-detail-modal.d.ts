interface AvailabilityDetailModalProps {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
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
  } | null;
}
export declare function AvailabilityDetailModal({
  open,
  onClose,
  onDelete,
  availability,
}: AvailabilityDetailModalProps): import("react").JSX.Element;
//# sourceMappingURL=availability-detail-modal.d.ts.map
