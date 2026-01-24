Object.defineProperty(exports, "__esModule", { value: true });
const module_landing_1 = require("../components/module-landing");
const InventoryPage = () => (
  <module_landing_1.ModuleLanding
    highlights={[
      "Ingredient master data and allergen metadata.",
      "Recipe costing and yield tracking.",
      "Par-level alerts for upcoming events.",
    ]}
    summary="Track ingredients, recipes, and par levels tied to production demand."
    title="Inventory"
  />
);
exports.default = InventoryPage;
