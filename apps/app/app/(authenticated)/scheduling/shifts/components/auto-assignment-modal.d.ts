type AutoAssignmentModalProps = {
  open: boolean;
  onClose: () => void;
  shiftId: string;
  shiftDetails?: {
    title?: string;
    startTime?: Date;
    endTime?: Date;
    locationName?: string;
    role?: string;
  };
};
export declare function AutoAssignmentModal({
  open,
  onClose,
  shiftId,
  shiftDetails,
}: AutoAssignmentModalProps): import("react").JSX.Element;
//# sourceMappingURL=auto-assignment-modal.d.ts.map
