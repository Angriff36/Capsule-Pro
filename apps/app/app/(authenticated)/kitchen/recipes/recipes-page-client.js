"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipesPageClient = void 0;
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("./actions");
const recipe_editor_modal_1 = require("./recipe-editor-modal");
const RecipesPageClient = () => {
  const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
  const router = (0, navigation_1.useRouter)();
  const handleSaveRecipe = async (formData) => {
    try {
      await (0, actions_1.createRecipe)(formData);
      sonner_1.toast.success("Recipe added successfully");
    } catch (error) {
      console.error("Failed to save recipe:", error);
      sonner_1.toast.error("Failed to save recipe. Please try again.");
      throw error;
    }
  };
  return (
    <>
      <recipe_editor_modal_1.RecipeEditorModal
        onOpenChange={setIsModalOpen}
        onSave={handleSaveRecipe}
        open={isModalOpen}
      />
      <button
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        <lucide_react_1.PlusIcon className="size-6" />
      </button>
    </>
  );
};
exports.RecipesPageClient = RecipesPageClient;
