var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const server_1 = require("@repo/auth/server");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../../../lib/tenant");
const mobile_recipe_client_1 = require("./mobile-recipe-client");
exports.metadata = {
  title: "Recipe Viewer",
  description: "Mobile-optimized recipe viewer for kitchen staff",
};
const MobileRecipePage = async ({ params }) => {
  const { orgId } = await (0, server_1.auth)();
  const resolvedParams = await params;
  if (!orgId) {
    return (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const recipeId = resolvedParams.recipeId;
  return (
    <>
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <link_1.default
          className="rounded-full p-2 hover:bg-muted"
          href={`/kitchen/recipes/${recipeId}`}
        >
          <lucide_react_1.ArrowLeft className="h-5 w-5" />
        </link_1.default>
        <h1 className="text-lg font-semibold">Recipe Viewer</h1>
      </header>

      <mobile_recipe_client_1.MobileRecipeClient
        recipeId={recipeId}
        tenantId={tenantId}
      />
    </>
  );
};
exports.default = MobileRecipePage;
