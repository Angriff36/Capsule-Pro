"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipesToolbar = void 0;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const tabs_1 = require("@repo/design-system/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const buildSearchParams = (current, updates) => {
  const params = new URLSearchParams(current.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
      return;
    }
    params.set(key, value);
  });
  return params;
};
const RecipesToolbar = ({
  tabs,
  activeTab,
  initialQuery,
  initialCategory,
  initialDietary,
  initialStatus,
  primaryAction,
}) => {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  const [query, setQuery] = (0, react_1.useState)(initialQuery ?? "");
  const currentParams = (0, react_1.useMemo)(
    () => buildSearchParams(searchParams, {}),
    [searchParams]
  );
  const updateParams = (updates) => {
    const params = buildSearchParams(currentParams, updates);
    const search = params.toString();
    router.replace(search ? `?${search}` : "?");
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <tabs_1.Tabs
          onValueChange={(value) => updateParams({ tab: value })}
          value={activeTab}
        >
          <tabs_1.TabsList className="h-10 bg-transparent p-0">
            {tabs.map((tab) => (
              <tabs_1.TabsTrigger
                className="h-10 rounded-none border-transparent border-b-2 px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                key={tab.value}
                value={tab.value}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {typeof tab.count === "number" && (
                    <span className="text-muted-foreground text-xs">
                      ({tab.count})
                    </span>
                  )}
                </span>
              </tabs_1.TabsTrigger>
            ))}
          </tabs_1.TabsList>
        </tabs_1.Tabs>
        {primaryAction ? (
          <button_1.Button asChild className="gap-2">
            <link_1.default href={primaryAction.href}>
              <lucide_react_1.PlusIcon size={16} />
              {primaryAction.label}
            </link_1.default>
          </button_1.Button>
        ) : null}
      </div>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q: query || null });
        }}
      >
        <div className="relative min-w-[240px] flex-1">
          <lucide_react_1.SearchIcon
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <input_1.Input
            className="pl-9"
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipes, dishes, or ingredients"
            value={query}
          />
        </div>
        <select_1.Select
          onValueChange={(value) =>
            updateParams({ category: value === "all" ? null : value })
          }
          value={initialCategory ?? "all"}
        >
          <select_1.SelectTrigger
            className="min-w-[140px] gap-2"
            size="default"
          >
            <lucide_react_1.FilterIcon size={14} />
            <select_1.SelectValue placeholder="Category" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">
              All categories
            </select_1.SelectItem>
            <select_1.SelectItem value="main course">
              Main course
            </select_1.SelectItem>
            <select_1.SelectItem value="appetizer">
              Appetizer
            </select_1.SelectItem>
            <select_1.SelectItem value="dessert">Dessert</select_1.SelectItem>
            <select_1.SelectItem value="side">Side</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        <select_1.Select
          onValueChange={(value) =>
            updateParams({ dietary: value === "all" ? null : value })
          }
          value={initialDietary ?? "all"}
        >
          <select_1.SelectTrigger className="min-w-[120px]" size="default">
            <select_1.SelectValue placeholder="Dietary" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">Dietary</select_1.SelectItem>
            <select_1.SelectItem value="gf">Gluten free</select_1.SelectItem>
            <select_1.SelectItem value="v">Vegetarian</select_1.SelectItem>
            <select_1.SelectItem value="vg">Vegan</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        <select_1.Select
          onValueChange={(value) =>
            updateParams({ status: value === "all" ? null : value })
          }
          value={initialStatus ?? "all"}
        >
          <select_1.SelectTrigger className="min-w-[120px]" size="default">
            <select_1.SelectValue placeholder="Status" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">Status</select_1.SelectItem>
            <select_1.SelectItem value="active">Active</select_1.SelectItem>
            <select_1.SelectItem value="inactive">Paused</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        <button_1.Button
          className="border-muted-foreground/30 text-muted-foreground"
          type="submit"
          variant="outline"
        >
          Apply filters
        </button_1.Button>
      </form>
    </div>
  );
};
exports.RecipesToolbar = RecipesToolbar;
