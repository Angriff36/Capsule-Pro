import { type InventoryItemWithStatus } from "../../../../lib/use-inventory";
interface CreateInventoryItemModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  editItem?: InventoryItemWithStatus | null;
}
export declare const CreateInventoryItemModal: ({
  open,
  onClose,
  onCreated,
  editItem,
}: CreateInventoryItemModalProps) => import("react").JSX.Element;
//# sourceMappingURL=create-inventory-item-modal.d.ts.map
