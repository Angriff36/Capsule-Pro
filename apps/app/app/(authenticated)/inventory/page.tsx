import { ModuleLanding } from "../components/module-landing";

const InventoryPage = () => (
  <ModuleLanding
    highlights={[
      "Ingredient master data and allergen metadata.",
      "Recipe costing and yield tracking.",
      "Par-level alerts for upcoming events.",
    ]}
    summary="Track ingredients, recipes, and par levels tied to production demand."
    title="Inventory"
  />
);

export default InventoryPage;
