import type { Conflict } from "../conflict-types";
type ConflictWarningPanelProps = {
  conflicts: Conflict[];
  onClose?: () => void;
};
export declare function ConflictWarningPanel({
  conflicts,
  onClose,
}: ConflictWarningPanelProps): import("react").JSX.Element | null;
//# sourceMappingURL=conflict-warning-panel.d.ts.map
