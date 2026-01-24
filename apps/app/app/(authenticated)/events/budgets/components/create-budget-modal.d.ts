import type {
  EventBudget,
  CreateEventBudgetInput,
  UpdateEventBudgetInput,
} from "@/app/lib/use-event-budgets";
interface CreateBudgetModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    data: CreateEventBudgetInput | UpdateEventBudgetInput
  ) => Promise<void>;
  budget?: EventBudget;
  loading: boolean;
}
export declare function CreateBudgetModal({
  open,
  onClose,
  onSave,
  budget,
  loading,
}: CreateBudgetModalProps): import("react").JSX.Element | null;
//# sourceMappingURL=create-budget-modal.d.ts.map
