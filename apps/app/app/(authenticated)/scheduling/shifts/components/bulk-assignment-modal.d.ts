type BulkAssignmentModalProps = {
  open: boolean;
  onClose: () => void;
  filters?: {
    scheduleId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
  };
  shiftIds?: string[];
};
export declare function BulkAssignmentModal({
  open,
  onClose,
  filters,
  shiftIds,
}: BulkAssignmentModalProps): import("react").JSX.Element;
//# sourceMappingURL=bulk-assignment-modal.d.ts.map
