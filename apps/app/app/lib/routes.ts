/**
 * Canonical Route Helpers — Client SDK
 *
 * This module is the ONLY place in client/UI code that may contain "/api/"
 * string literals. All other client code MUST import route helpers from here
 * instead of hardcoding endpoint paths.
 *
 * To add a new route:
 *   1. Add the route handler in apps/api/app/api/...
 *   2. Run: node scripts/manifest/generate-route-manifest.mjs
 *   3. Add a re-export below (or import directly from the generated file)
 *   4. Use the helper in your component: `apiFetch(routes.myNewRoute())`
 *
 * The CI conformance check and ESLint rule will reject any raw "/api/" strings
 * in client code outside this module and the allowlisted files.
 *
 * @module routes
 */

// ---------------------------------------------------------------------------
// Kitchen — Recipes
// ---------------------------------------------------------------------------

/** GET /api/kitchen/recipes/:recipeId/versions */
export const kitchenRecipeVersions = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/versions`;

/** GET /api/kitchen/recipes/:recipeId/versions/:versionId */
export const kitchenRecipeVersionDetail = (
  recipeId: string,
  versionId: string
): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/versions/${encodeURIComponent(versionId)}`;

/** GET /api/kitchen/recipes/:recipeId/versions/compare?from=X&to=Y */
export const kitchenRecipeVersionsCompare = (
  recipeId: string,
  from: string,
  to: string
): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/versions/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

/** GET /api/kitchen/recipes/:recipeId/ingredients */
export const kitchenRecipeIngredients = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/ingredients`;

/** GET /api/kitchen/recipes/:recipeId/steps */
export const kitchenRecipeSteps = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/steps`;

/** GET /api/kitchen/recipes/:recipeId/scale */
export const kitchenRecipeScale = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/scale`;

/** GET /api/kitchen/recipes/:recipeId/cost */
export const kitchenRecipeCost = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/cost`;

/** POST /api/kitchen/recipes/:recipeId/update-budgets */
export const kitchenRecipeUpdateBudgets = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/update-budgets`;

/** POST /api/kitchen/recipes/composite/create-with-version */
export const kitchenRecipeCompositeCreate = (): string =>
  "/api/kitchen/recipes/composite/create-with-version";

/** POST /api/kitchen/recipes/:recipeId/composite/update-with-version */
export const kitchenRecipeCompositeUpdate = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/composite/update-with-version`;

/** POST /api/kitchen/recipes/:recipeId/composite/restore-version */
export const kitchenRecipeCompositeRestore = (recipeId: string): string =>
  `/api/kitchen/recipes/${encodeURIComponent(recipeId)}/composite/restore-version`;

// ---------------------------------------------------------------------------
// Kitchen — Tasks
// ---------------------------------------------------------------------------

/** GET /api/kitchen/tasks/available */
export const kitchenTasksAvailable = (): string =>
  "/api/kitchen/tasks/available";

/** GET /api/kitchen/tasks/my-tasks */
export const kitchenTasksMyTasks = (): string => "/api/kitchen/tasks/my-tasks";

/** POST /api/kitchen/kitchen-tasks/commands/claim */
export const kitchenTasksCommandsClaim = (): string =>
  "/api/kitchen/kitchen-tasks/commands/claim";

// ---------------------------------------------------------------------------
// Kitchen — Waste
// ---------------------------------------------------------------------------

/** GET /api/kitchen/waste/entries */
export const kitchenWasteEntries = (): string => "/api/kitchen/waste/entries";

/** GET /api/kitchen/waste/reasons */
export const kitchenWasteReasons = (): string => "/api/kitchen/waste/reasons";

/** GET /api/kitchen/waste/reports */
export const kitchenWasteReports = (): string => "/api/kitchen/waste/reports";

/** GET /api/kitchen/waste/trends */
export const kitchenWasteTrends = (): string => "/api/kitchen/waste/trends";

/** GET /api/kitchen/waste/units */
export const kitchenWasteUnits = (): string => "/api/kitchen/waste/units";

// ---------------------------------------------------------------------------
// Kitchen — Allergens
// ---------------------------------------------------------------------------

/** GET /api/kitchen/allergens/warnings */
export const kitchenAllergensWarnings = (): string =>
  "/api/kitchen/allergens/warnings";

/** POST /api/kitchen/allergens/detect-conflicts */
export const kitchenAllergensDetectConflicts = (): string =>
  "/api/kitchen/allergens/detect-conflicts";

/** POST /api/kitchen/allergens/update-dish */
export const kitchenAllergensUpdateDish = (): string =>
  "/api/kitchen/allergens/update-dish";

// ---------------------------------------------------------------------------
// Kitchen — Prep Lists
// ---------------------------------------------------------------------------

/** POST /api/kitchen/prep-lists/generate */
export const kitchenPrepListsGenerate = (): string =>
  "/api/kitchen/prep-lists/generate";

/** POST /api/kitchen/prep-lists/save */
export const kitchenPrepListsSave = (): string =>
  "/api/kitchen/prep-lists/save";

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/** GET /api/analytics/kitchen */
export const analyticsKitchen = (): string => "/api/analytics/kitchen";

/** GET /api/analytics/finance */
export const analyticsFinance = (): string => "/api/analytics/finance";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** GET /api/events */
export const events = (): string => "/api/events";

/** GET /api/events/:eventId/export/csv */
export const eventsExportCsv = (eventId: string): string =>
  `/api/events/${encodeURIComponent(eventId)}/export/csv`;

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

/** GET /api/inventory/items */
export const inventoryItems = (): string => "/api/inventory/items";

/** GET /api/inventory/items/:id */
export const inventoryItemById = (id: string): string =>
  `/api/inventory/items/${encodeURIComponent(id)}`;

/** POST /api/inventory/stock-levels/adjust */
export const inventoryStockLevelsAdjust = (): string =>
  "/api/inventory/stock-levels/adjust";

/** GET /api/inventory/stock-levels/locations */
export const inventoryStockLevelsLocations = (): string =>
  "/api/inventory/stock-levels/locations";

/** GET /api/inventory/forecasts */
export const inventoryForecasts = (): string => "/api/inventory/forecasts";

/** GET /api/inventory/forecasts/alerts */
export const inventoryForecastsAlerts = (): string =>
  "/api/inventory/forecasts/alerts";

// ---------------------------------------------------------------------------
// Collaboration
// ---------------------------------------------------------------------------

/** GET /api/collaboration/auth */
export const collaborationAuth = (): string => "/api/collaboration/auth";

// ---------------------------------------------------------------------------
// Command Board
// ---------------------------------------------------------------------------

/** POST /api/command-board/chat (lives in apps/app) */
export const commandBoardChat = (): string => "/api/command-board/chat";

// ---------------------------------------------------------------------------
// Staff — Shifts
// ---------------------------------------------------------------------------

/** POST /api/staff/shifts/commands/create-validated */
export const staffShiftsCreateValidated = (): string =>
  "/api/staff/shifts/commands/create-validated";

/** POST /api/staff/shifts/commands/update-validated */
export const staffShiftsUpdateValidated = (): string =>
  "/api/staff/shifts/commands/update-validated";
