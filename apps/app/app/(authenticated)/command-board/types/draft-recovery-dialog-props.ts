export interface DraftRecoveryDialogProps {
  open: boolean;
  draftTimestamp: Date | null;
  onRestore: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}