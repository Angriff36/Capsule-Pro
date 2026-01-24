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
const header_1 = require("../../../components/header");
const actions_1 = require("../actions");
const NewRecipePage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const units = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT id, code, name
      FROM core.units
      ORDER BY code ASC
    `);
  return (
    <>
      <header_1.Header page="New Recipe" pages={["Kitchen Ops", "Recipes"]}>
        <button_1.Button asChild variant="ghost">
          <link_1.default href="/kitchen/recipes">
            Back to recipes
          </link_1.default>
        </button_1.Button>
      </header_1.Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <form
          action={actions_1.createRecipe}
          className="grid gap-6 lg:grid-cols-3"
          encType="multipart/form-data"
        >
          <card_1.Card className="lg:col-span-2">
            <card_1.CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="name">
                    Recipe name
                  </label>
                  <input_1.Input
                    id="name"
                    name="name"
                    placeholder="Herb Crusted Rack of Lamb"
                    required
                  />
                </div>
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
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="description">
                  Description
                </label>
                <textarea_1.Textarea
                  id="description"
                  name="description"
                  placeholder="Short summary for the kitchen team."
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="yieldQuantity"
                  >
                    Yield quantity
                  </label>
                  <input_1.Input
                    id="yieldQuantity"
                    min="1"
                    name="yieldQuantity"
                    placeholder="4"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="yieldUnit">
                    Yield unit
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-foreground text-sm"
                    defaultValue={units[0]?.code ?? "ea"}
                    id="yieldUnit"
                    name="yieldUnit"
                  >
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.code}>
                        {unit.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="yieldDescription"
                  >
                    Yield notes
                  </label>
                  <input_1.Input
                    id="yieldDescription"
                    name="yieldDescription"
                    placeholder="Serves 4"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="prepTimeMinutes"
                  >
                    Prep time (min)
                  </label>
                  <input_1.Input
                    id="prepTimeMinutes"
                    min="0"
                    name="prepTimeMinutes"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="cookTimeMinutes"
                  >
                    Cook time (min)
                  </label>
                  <input_1.Input
                    id="cookTimeMinutes"
                    min="0"
                    name="cookTimeMinutes"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="restTimeMinutes"
                  >
                    Rest time (min)
                  </label>
                  <input_1.Input
                    id="restTimeMinutes"
                    min="0"
                    name="restTimeMinutes"
                    type="number"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="difficultyLevel"
                  >
                    Difficulty (1-5)
                  </label>
                  <input_1.Input
                    id="difficultyLevel"
                    max="5"
                    min="1"
                    name="difficultyLevel"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="tags">
                    Tags (comma separated)
                  </label>
                  <input_1.Input
                    id="tags"
                    name="tags"
                    placeholder="GF, seasonal"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="ingredients">
                  Ingredients (one per line)
                </label>
                <textarea_1.Textarea
                  id="ingredients"
                  name="ingredients"
                  placeholder="2 lb rack of lamb"
                  rows={6}
                />
                <p className="text-muted-foreground text-xs">
                  Tip: start with quantity and unit, then ingredient name.
                </p>
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="steps">
                  Steps (one per line)
                </label>
                <textarea_1.Textarea
                  id="steps"
                  name="steps"
                  placeholder="Trim the racks and season generously."
                  rows={6}
                />
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="imageFile">
                  Hero image
                </label>
                <input_1.Input
                  accept="image/*"
                  id="imageFile"
                  name="imageFile"
                  type="file"
                />
              </div>
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="notes">
                  Kitchen notes
                </label>
                <textarea_1.Textarea
                  id="notes"
                  name="notes"
                  placeholder="Share plating or storage notes for staff."
                  rows={5}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button_1.Button type="submit">Create recipe</button_1.Button>
                <button_1.Button asChild type="button" variant="outline">
                  <link_1.default href="/kitchen/recipes">
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
exports.default = NewRecipePage;
