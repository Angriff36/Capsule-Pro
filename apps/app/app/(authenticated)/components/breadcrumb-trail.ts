import { getModuleKeyFromPathname, modules } from "./module-nav";

/**
 * A single breadcrumb entry for the persistent breadcrumb bar.
 *
 * `href` is omitted for the current (last) page; ancestors are always
 * clickable so users can jump back to any level of the entity chain.
 */
export interface BreadcrumbItem {
  href?: string;
  label: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_PATTERN = /^\d+$/;

function isDynamicSegment(segment: string): boolean {
  return UUID_PATTERN.test(segment) || NUMERIC_PATTERN.test(segment);
}

/**
 * Maps a static URL segment to a human-readable label.
 *
 * Segment names are unique enough across modules to share a single map.
 * Keys are the raw path segments (e.g. "prep-lists"), values are the
 * display labels (e.g. "Prep Lists").
 */
const SEGMENT_LABELS: Record<string, string> = {
  // Events module
  "battle-board": "Event Timeline",
  "battle-boards": "Battle Boards",
  budgets: "Budgets",
  budget: "Budget",
  contracts: "Contracts",
  "kitchen-dashboard": "Kitchen Dashboard",
  reports: "Reports",
  import: "Imports",
  intake: "Event Intake",
  "menu-builder": "Menu Builder",
  catering: "Catering",
  waitlist: "Waitlist",
  staff: "Staff",
  guests: "Guests",
  timeline: "Timeline",
  "run-sheet": "Run Sheet",
  "follow-ups": "Follow-ups",
  board: "Command Board",
  profitability: "Profitability",
  new: "New",
  // Kitchen module
  recipes: "Recipes",
  "prep-lists": "Prep Lists",
  waste: "Waste Tracking",
  "waste/mobile": "Mobile Waste",
  allergens: "Allergens",
  stations: "Stations",
  tasks: "Tasks",
  containers: "Containers",
  "prep-task-plan-workflows": "Prep Task Workflows",
  "quality-assurance": "Quality Assurance",
  iot: "IoT Monitoring",
  equipment: "Equipment",
  "nutrition-labels": "Nutrition Labels",
  team: "Team",
  // Inventory / Warehouse
  items: "Items",
  scanner: "Scanner",
  transfers: "Transfers",
  "recipe-costs": "Recipe Costs",
  "vendor-catalogs": "Vendor Catalogs",
  "pricing-tiers": "Pricing Tiers",
  levels: "Levels",
  forecasts: "Forecasts",
  "variance-reports": "Variance Reports",
  receiving: "Receiving",
  history: "History",
  putaway: "Putaway",
  "pick-pack": "Pick & Pack",
  shipments: "Shipments",
  audits: "Audits",
  // Scheduling / Staff
  shifts: "Shifts",
  availability: "Availability",
  requests: "Requests",
  "time-off": "Time Off",
  optimization: "Optimization",
  leaderboard: "Leaderboard",
  notifications: "Notifications",
  "manifest-editor": "Rules Explorer",
  "manifest-playground": "Rules Playground",
  timeclock: "Timeclock",
  performance: "Performance",
  training: "Training",
  "my-training": "My Training",
  // Staffing
  recommendations: "AI Recommendations",
  coverage: "Coverage",
  // Payroll
  overview: "Overview",
  timecards: "Timecards",
  payouts: "Payouts",
  runs: "Pay Runs",
  periods: "Pay Periods",
  "direct-deposit": "Direct Deposit",
  "tax-setup": "Tax Setup",
  approvals: "Approvals",
  // CRM
  pipeline: "Pipeline",
  clients: "Clients",
  venues: "Venues",
  proposals: "Proposals",
  templates: "Templates",
  communications: "Communications",
  scoring: "Lead Scoring",
  // Analytics
  sales: "Sales",
  executive: "Executive",
  finance: "Finance",
  "chart-builder": "Chart Builder",
  "activity-feed": "Activity Feed",
  "menu-engineering": "Menu Engineering",
  "multi-location": "Multi-location",
  bottlenecks: "Bottlenecks",
  // Logistics
  routes: "Routes",
  dispatch: "Dispatch",
  tracking: "Tracking",
  drivers: "Drivers",
  vehicles: "Vehicles",
  // Facilities
  schedules: "PM Schedules",
  areas: "Areas",
  assets: "Assets",
  // Procurement
  requisitions: "Requisitions",
  vendors: "Vendors",
  "vendor-contracts": "Vendor Contracts",
  "purchase-orders": "Purchase Orders",
  // Accounting
  "chart-of-accounts": "Chart of Accounts",
  invoices: "Invoices",
  payments: "Payments",
  collections: "Collections",
  "revenue-recognition": "Revenue Recognition",
  "payment-methods": "Payment Methods",
  "bank-reconciliation": "Bank Reconciliation",
  "financial-reporting": "Financial Reports",
  // Administrative
  kanban: "Kanban",
  chat: "Chat",
  "overview-boards": "Overview Boards",
  "email-templates": "Email Templates",
  "email-workflows": "Email Workflows",
  "audit-log": "Audit Log",
  integrations: "Integrations",
  security: "Security",
  alerts: "Alert Configuration",
  // Marketing
  campaigns: "Campaigns",
  // Tools
  ai: "AI",
  "autofill-reports": "Autofill Reports",
  conflicts: "Conflicts",
  "inventory-import": "Inventory Import",
  sync: "Calendar Sync",
};

/**
 * Maps a parent path context to a singular label for a dynamic (ID) child.
 * Used when the URL contains an opaque ID so we can still show a meaningful,
 * clickable crumb like "Event" or "Prep List" instead of skipping it.
 *
 * The key is the immediately-preceding static segment.
 */
const DYNAMIC_CHILD_LABELS: Record<string, string> = {
  events: "Event",
  recipes: "Recipe",
  "prep-lists": "Prep List",
  tasks: "Task",
  budgets: "Budget",
  budget: "Budget",
  contracts: "Contract",
  "battle-boards": "Battle Board",
  "battle-board": "Event Timeline",
  staff: "Staff Member",
  guests: "Guest",
  invoices: "Invoice",
  payments: "Payment",
  runs: "Pay Run",
  periods: "Pay Period",
  proposals: "Proposal",
  clients: "Client",
  venues: "Venue",
  vendors: "Vendor",
  "purchase-orders": "Purchase Order",
  requisitions: "Requisition",
  shipments: "Shipment",
  routes: "Route",
  drivers: "Driver",
  vehicles: "Vehicle",
  assets: "Asset",
  areas: "Area",
  schedules: "PM Schedule",
  items: "Item",
};

function titleCase(segment: string): string {
  return segment
    .split("-")
    .map((word) => {
      if (!word) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Resolves a single URL segment to a display label, using surrounding context.
 *
 * @param segment      The raw path segment.
 * @param parentSegment The immediately preceding static segment (for dynamic
 *                       children), or undefined if this is the first segment.
 */
function resolveSegmentLabel(segment: string, parentSegment?: string): string {
  if (isDynamicSegment(segment)) {
    return DYNAMIC_CHILD_LABELS[parentSegment ?? ""] ?? "Details";
  }

  return SEGMENT_LABELS[segment] ?? titleCase(segment);
}

/**
 * Builds a single crumb for one URL segment. Dynamic segments infer a type
 * label from the preceding static segment; numeric ids are shown as
 * `"<Type> #<n>"`. The final crumb drops its `href` to render as the current
 * page.
 */
function buildSegmentCrumb(
  segment: string,
  parentSegment: string | undefined,
  isLast: boolean,
  href: string
): BreadcrumbItem {
  if (isDynamicSegment(segment)) {
    const baseLabel = resolveSegmentLabel(segment, parentSegment);
    const displayLabel = NUMERIC_PATTERN.test(segment)
      ? `${baseLabel} #${segment}`
      : baseLabel;
    return isLast ? { label: displayLabel } : { label: displayLabel, href };
  }

  const label = resolveSegmentLabel(segment, parentSegment);
  return isLast ? { label } : { label, href };
}

export interface BreadcrumbTrail {
  /**
   * The "parent context" — the owning module the current page belongs to.
   * Shown as a chip so users never lose track of which area an entity lives in,
   * critical when multiple tabs are open on different events.
   */
  context: {
    href: string;
    label: string;
  } | null;
  /** The full ordered list of crumbs, ancestors first, current page last. */
  items: BreadcrumbItem[];
}

/**
 * Generates an ordered breadcrumb trail plus a parent-context chip from a
 * URL pathname. Works across every module, not just Events.
 *
 * Each ancestor crumb carries an `href` so it is clickable; the final (current)
 * crumb has no href. Dynamic ID segments are resolved to a type label inferred
 * from the preceding segment (e.g. `/events/<id>` -> "Event").
 *
 * @example
 * generateBreadcrumbTrail("/events/abc/prep-lists/123/tasks/9")
 * // items: [Events, Event, Prep Lists, Prep List, Tasks, Task #9(?) ]
 *
 * @param pathname - The current URL pathname (e.g. "/events/123/budget")
 * @returns A trail object, or one with an empty `items` array at a module root.
 */
export function generateBreadcrumbTrail(pathname: string): BreadcrumbTrail {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { items: [], context: null };
  }

  // Resolve the root module for context + the first crumb.
  const moduleKey = getModuleKeyFromPathname(pathname);
  const activeModule = modules.find((module) => module.key === moduleKey);

  const context = activeModule
    ? { href: activeModule.href, label: activeModule.label }
    : null;

  // Determine how many leading path components the module root owns
  // (most are single-component like "events", but e.g. logistics uses
  // "/logistics/routes"). These are represented by the module crumb, so we
  // skip them when walking the remaining segments.
  const rootComponents = context
    ? context.href.split("/").filter(Boolean)
    : [segments[0]];

  // At the module root there is nothing deeper to show.
  const remaining =
    segments.length <= rootComponents.length
      ? []
      : segments.slice(rootComponents.length);

  const items: BreadcrumbItem[] = [];

  // Seed with the module root crumb (clickable) when there is deeper context.
  if (context && remaining.length > 0) {
    items.push({ label: context.label, href: context.href });
  }

  // Track the last *static* segment so dynamic children can infer their type.
  let lastStaticSegment = rootComponents.at(-1);

  // Walk every remaining segment, accumulating hrefs relative to the full path.
  for (let offset = 0; offset < remaining.length; offset++) {
    const segment = remaining[offset];
    const fullPathIndex = rootComponents.length + offset; // index into `segments`
    const href = `/${segments.slice(0, fullPathIndex + 1).join("/")}`;
    const isLast = offset === remaining.length - 1;

    if (!isDynamicSegment(segment)) {
      lastStaticSegment = segment;
    }
    items.push(buildSegmentCrumb(segment, lastStaticSegment, isLast, href));
  }

  // The final crumb is the current page — strip its href so it renders as a
  // non-link "page" element.
  const lastItem = items.at(-1);
  if (lastItem) {
    items[items.length - 1] = { label: lastItem.label };
  }

  return { items, context };
}
