import type {
  CreateBudgetInput,
  UpdateBudgetInput,
  LaborBudget,
} from "@/app/lib/use-labor-budgets";
interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateBudgetInput | UpdateBudgetInput) => Promise<void>;
  budget?: LaborBudget;
  loading?: boolean;
}
export declare function BudgetFormModal({
  open,
  onClose,
  onSave,
  budget,
  loading,
}: BudgetFormModalProps): import("react").JSX.Element;
//# sourceMappingURL=budget-form-modal.d.ts.map
