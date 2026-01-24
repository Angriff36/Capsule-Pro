type Ingredient = {
  id: string;
  quantity: string;
  unit: string;
  name: string;
  optional: boolean;
};
type Instruction = {
  id: string;
  stepNumber: number;
  text: string;
};
type RecipeEditorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: {
    id?: string;
    name?: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: string;
    tags?: string[];
    ingredients?: Ingredient[];
    instructions?: Instruction[];
  };
  onSave: (data: FormData) => Promise<void>;
};
export declare const RecipeEditorModal: ({
  open,
  onOpenChange,
  recipe,
  onSave,
}: RecipeEditorModalProps) => import("react").JSX.Element;
//# sourceMappingURL=recipe-editor-modal.d.ts.map
