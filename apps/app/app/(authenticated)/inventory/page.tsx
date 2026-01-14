import { ModuleLanding } from "../components/module-landing";

const InventoryPage = () => (
  <ModuleLanding
    title="Inventory"
    summary="Track ingredients, recipes, and par levels tied to production demand."
    highlights={[
      "Ingredient master data and allergen metadata.",
      "Recipe costing and yield tracking.",
      "Par-level alerts for upcoming events.",
    ]}
  />
);

export default InventoryPage;
