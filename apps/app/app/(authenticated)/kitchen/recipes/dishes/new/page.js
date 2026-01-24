var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../../../lib/tenant");
const header_1 = require("../../../../components/header");
const actions_1 = require("../../actions");
const NewDishPage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const recipes = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, name
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY name ASC
    `);
  return (
    <>
      <header_1.Header page="New Dish" pages={["Kitchen Ops", "Dishes"]}>
        <button_1.Button asChild variant="ghost">
          <link_1.default href="/kitchen/recipes?tab=dishes">
            Back to dishes
          </link_1.default>
        </button_1.Button>
      </header_1.Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <form
          action={actions_1.createDish}
          className="grid gap-6 lg:grid-cols-3"
          encType="multipart/form-data"
        >
          <card_1.Card className="lg:col-span-2">
            <card_1.CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="name">
                    Dish name
                  </label>
                  <input_1.Input
                    id="name"
                    name="name"
                    placeholder="Herb Crusted Rack of Lamb"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="recipeId">
                    Linked recipe
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-foreground text-sm"
                    id="recipeId"
                    name="recipeId"
                    required
                  >
                    <option value="">Select recipe</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="category">
                    Category
                  </label>
                  <input_1.Input
                    id="category"
                    name="category"
                    placeholder="Main course"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="serviceStyle">
                    Service style
                  </label>
                  <input_1.Input
                    id="serviceStyle"
                    name="serviceStyle"
                    placeholder="Plated, family style"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="pricePerPerson"
                  >
                    Menu price per person
                  </label>
                  <input_1.Input
                    id="pricePerPerson"
                    name="pricePerPerson"
                    placeholder="38"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="costPerPerson"
                  >
                    Food cost per person
                  </label>
                  <input_1.Input
                    id="costPerPerson"
                    name="costPerPerson"
                    placeholder="12.5"
                    type="number"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="minPrepLeadDays"
                  >
                    Min prep lead (days)
                  </label>
                  <input_1.Input
                    id="minPrepLeadDays"
                    min="0"
                    name="minPrepLeadDays"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="maxPrepLeadDays"
                  >
                    Max prep lead (days)
                  </label>
                  <input_1.Input
                    id="maxPrepLeadDays"
                    min="0"
                    name="maxPrepLeadDays"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="portionSizeDescription"
                  >
                    Portion size
                  </label>
                  <input_1.Input
                    id="portionSizeDescription"
                    name="portionSizeDescription"
                    placeholder="6 oz per guest"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="dietaryTags">
                    Dietary tags
                  </label>
                  <input_1.Input
                    id="dietaryTags"
                    name="dietaryTags"
                    placeholder="GF, dairy free"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="allergens">
                    Allergens
                  </label>
                  <input_1.Input
                    id="allergens"
                    name="allergens"
                    placeholder="nuts, dairy"
                  />
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="imageFile">
                  Presentation image
                </label>
                <input_1.Input
                  accept="image/*"
                  id="imageFile"
                  name="imageFile"
                  type="file"
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="description">
                  Service notes
                </label>
                <textarea_1.Textarea
                  id="description"
                  name="description"
                  placeholder="Pair with roasted vegetables or seasonal garnish."
                  rows={5}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button_1.Button type="submit">Create dish</button_1.Button>
                <button_1.Button asChild type="button" variant="outline">
                  <link_1.default href="/kitchen/recipes?tab=dishes">
                    Cancel
                  </link_1.default>
                </button_1.Button>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </form>
      </div>
    </>
  );
};
exports.default = NewDishPage;
