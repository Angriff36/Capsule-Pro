export type ModuleKey =
  | "events"
  | "calendar"
  | "kitchen"
  | "warehouse"
  | "scheduling"
  | "staff"
  | "staffing"
  | "payroll"
  | "administrative"
  | "crm"
  | "analytics"
  | "logistics"
  | "facilities"
  | "procurement"
  | "knowledge-base"
  | "inventory"
  | "accounting"
  | "marketing"
  | "search";

interface ModuleSidebarItem {
  title: string;
  href?: string;
}

interface ModuleSidebarSection {
  label: string;
  items: ModuleSidebarItem[];
}

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  href: string;
  sidebar: ModuleSidebarSection[];
}

export const modules: ModuleDefinition[] = [
  {
    key: "calendar",
    label: "Calendar",
    href: "/calendar",
    sidebar: [
      {
        label: "Calendar",
        items: [
          { title: "Calendar View", href: "/calendar" },
          { title: "Calendar Sync", href: "/calendar/sync" },
          { title: "Add Event", href: "/events/new" },
          { title: "Schedule Shift", href: "/scheduling/shifts/new" },
        ],
      },
    ],
  },
  {
    key: "events",
    label: "Events",
    href: "/events",
    sidebar: [
      {
        label: "Events",
        items: [
          { title: "All Events", href: "/events" },
          { title: "Calendar", href: "/calendar" },
          { title: "Kitchen Dashboard", href: "/events/kitchen-dashboard" },
          { title: "Catering", href: "/events/catering" },
        ],
      },
      {
        label: "Planning",
        items: [
          { title: "Battle Boards", href: "/events/battle-boards" },
          { title: "Budgets", href: "/events/budgets" },
        ],
      },
      {
        label: "Management",
        items: [
          { title: "Contracts", href: "/events/contracts" },
          { title: "Reports", href: "/events/reports" },
          { title: "Imports", href: "/events/import" },
        ],
      },
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen",
    href: "/kitchen",
    sidebar: [
      {
        label: "Main",
        items: [{ title: "Dashboard", href: "/kitchen" }, { title: "Inbox" }],
      },
      {
        label: "Kitchen",
        items: [
          { title: "Events" },
          { title: "Production", href: "/kitchen" },
          { title: "Recipes", href: "/kitchen/recipes" },
          { title: "Prep Lists", href: "/kitchen/prep-lists" },
          { title: "Inventory", href: "/kitchen/inventory" },
          { title: "Waste Tracking", href: "/kitchen/waste" },
          { title: "Allergens", href: "/kitchen/allergens" },
          { title: "Stations", href: "/kitchen/stations" },
          { title: "Tasks", href: "/kitchen/tasks" },
          { title: "Containers", href: "/kitchen/containers" },
          {
            title: "Prep Task Workflows",
            href: "/kitchen/prep-task-plan-workflows",
          },
        ],
      },
      {
        label: "Safety & Compliance",
        items: [
          { title: "Quality Assurance", href: "/kitchen/quality-assurance" },
          { title: "IoT Monitoring", href: "/kitchen/iot" },
          { title: "Equipment", href: "/kitchen/equipment" },
          { title: "Nutrition Labels", href: "/kitchen/nutrition-labels" },
        ],
      },
      {
        label: "Staff",
        items: [
          { title: "Team", href: "/kitchen/team" },
          { title: "Schedule", href: "/kitchen/schedule" },
        ],
      },
    ],
  },
  {
    key: "warehouse",
    label: "Warehouse",
    href: "/warehouse",
    sidebar: [
      {
        label: "Warehouse",
        items: [
          { title: "Overview", href: "/warehouse" },
          { title: "Inventory", href: "/warehouse/inventory" },
          { title: "Receiving", href: "/warehouse/receiving" },
          { title: "Shipments", href: "/warehouse/shipments" },
          { title: "Audits", href: "/warehouse/audits" },
          { title: "Cycle Counting", href: "/cycle-counting" },
        ],
      },
    ],
  },
  {
    key: "scheduling",
    label: "Scheduling",
    href: "/scheduling",
    sidebar: [
      {
        label: "Scheduling",
        items: [
          { title: "Overview", href: "/scheduling" },
          { title: "Shifts", href: "/scheduling/shifts" },
          { title: "Availability", href: "/scheduling/availability" },
          { title: "Requests", href: "/scheduling/requests" },
          { title: "Budgets", href: "/scheduling/budgets" },
          { title: "Optimization", href: "/scheduling/optimization" },
        ],
      },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    href: "/staff",
    sidebar: [
      {
        label: "Staff",
        items: [
          { title: "Overview", href: "/staff" },
          { title: "Team", href: "/staff/team" },
          { title: "Schedule", href: "/scheduling" },
          { title: "Availability", href: "/scheduling/availability" },
          { title: "Time Off", href: "/scheduling/time-off" },
          { title: "Performance", href: "/staff/performance" },
          { title: "Training", href: "/staff/training" },
        ],
      },
    ],
  },
  {
    key: "staffing",
    label: "Staffing",
    href: "/staffing",
    sidebar: [
      {
        label: "Staffing",
        items: [
          { title: "Overview", href: "/staffing" },
          { title: "AI Recommendations", href: "/staffing/recommendations" },
          { title: "Coverage", href: "/staffing/coverage" },
          { title: "Shifts", href: "/staffing/shifts" },
          { title: "Availability", href: "/staffing/availability" },
        ],
      },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    href: "/payroll",
    sidebar: [
      {
        label: "Payroll",
        items: [
          { title: "Overview", href: "/payroll" },
          { title: "Timecards", href: "/payroll/timecards" },
          { title: "Payouts", href: "/payroll/payouts" },
          { title: "Pay Runs", href: "/payroll/runs" },
          { title: "Pay Periods", href: "/payroll/periods" },
          { title: "Direct Deposit", href: "/payroll/direct-deposit" },
          { title: "Tax Setup", href: "/payroll/tax-setup" },
          { title: "Reports", href: "/payroll/reports" },
        ],
      },
    ],
  },
  {
    key: "administrative",
    label: "Administrative",
    href: "/administrative",
    sidebar: [
      {
        label: "Administrative",
        items: [
          { title: "Overview", href: "/administrative" },
          { title: "Kanban", href: "/administrative/kanban" },
          { title: "Chat", href: "/administrative/chat" },
          {
            title: "Overview Boards",
            href: "/administrative/overview-boards",
          },
        ],
      },
      {
        label: "Settings",
        items: [
          { title: "Overview", href: "/settings" },
          { title: "Rules Explorer", href: "/settings/manifest-editor" },
          { title: "Rules Playground", href: "/settings/manifest-playground" },
          { title: "Team", href: "/settings/team" },
          { title: "Integrations", href: "/settings/integrations" },
          { title: "Security", href: "/settings/security" },
          { title: "Alert Configuration", href: "/settings/alerts" },
          { title: "Email Templates", href: "/settings/email-templates" },
          { title: "Email Workflows", href: "/settings/email-workflows" },
          { title: "Audit Log", href: "/settings/audit-log" },
        ],
      },
    ],
  },
  {
    key: "crm",
    label: "CRM",
    href: "/crm",
    sidebar: [
      {
        label: "CRM",
        items: [
          { title: "Overview", href: "/crm" },
          { title: "Pipeline", href: "/crm/pipeline" },
          { title: "Clients", href: "/crm/clients" },
          { title: "Venues", href: "/crm/venues" },
          { title: "Proposals", href: "/crm/proposals" },
          { title: "Proposal Templates", href: "/crm/proposals/templates" },
          { title: "Communications", href: "/crm/communications" },
          { title: "Lead Scoring", href: "/crm/scoring" },
        ],
      },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    href: "/analytics",
    sidebar: [
      {
        label: "Analytics",
        items: [
          { title: "Overview", href: "/analytics" },
          { title: "Kitchen", href: "/analytics/kitchen" },
          { title: "Events", href: "/analytics/events" },
          { title: "Sales", href: "/analytics/sales" },
          { title: "Finance", href: "/analytics/finance" },
          { title: "Staff", href: "/analytics/staff" },
          { title: "Clients", href: "/analytics/clients" },
          { title: "Activity Feed", href: "/analytics/activity-feed" },
        ],
      },
    ],
  },
  {
    key: "logistics",
    label: "Logistics",
    href: "/logistics/routes",
    sidebar: [
      {
        label: "Logistics",
        items: [
          { title: "Overview", href: "/logistics" },
          { title: "Routes", href: "/logistics/routes" },
          { title: "Dispatch", href: "/logistics/dispatch" },
          { title: "Shipments", href: "/logistics/shipments" },
          { title: "Tracking", href: "/logistics/tracking" },
          { title: "Drivers", href: "/logistics/drivers" },
          { title: "Vehicles", href: "/logistics/vehicles" },
        ],
      },
    ],
  },
  {
    key: "facilities",
    label: "Facilities",
    href: "/facilities",
    sidebar: [
      {
        label: "Facilities",
        items: [
          { title: "Work Orders", href: "/facilities" },
          { title: "PM Schedules", href: "/facilities/schedules" },
          { title: "Areas", href: "/facilities/areas" },
          { title: "Assets", href: "/facilities/assets" },
        ],
      },
    ],
  },
  {
    key: "procurement",
    label: "Procurement",
    href: "/procurement",
    sidebar: [
      {
        label: "Procurement",
        items: [
          { title: "Overview", href: "/procurement" },
          { title: "Requisitions", href: "/procurement/requisitions" },
          { title: "Approvals", href: "/procurement/approvals" },
          { title: "Budget", href: "/procurement/budget" },
          { title: "Vendor Contracts", href: "/procurement/vendor-contracts" },
          { title: "Vendors", href: "/procurement/vendors" },
          { title: "Purchase Orders", href: "/procurement/purchase-orders" },
        ],
      },
    ],
  },
  {
    key: "knowledge-base",
    label: "Knowledge Base",
    href: "/knowledge-base",
    sidebar: [
      {
        label: "Knowledge Base",
        items: [{ title: "All Articles", href: "/knowledge-base" }],
      },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/inventory",
    sidebar: [
      {
        label: "Inventory",
        items: [
          { title: "Items", href: "/inventory/items" },
          { title: "Scanner", href: "/inventory/scanner" },
          { title: "Transfers", href: "/inventory/transfers" },
          { title: "Recipe Costs", href: "/inventory/recipe-costs" },
          { title: "Vendor Catalogs", href: "/inventory/vendor-catalogs" },
          { title: "Pricing Tiers", href: "/inventory/pricing-tiers" },
          { title: "Levels", href: "/inventory/levels" },
          { title: "Forecasts", href: "/inventory/forecasts" },
          { title: "Variance Reports", href: "/inventory/variance-reports" },
          { title: "Import", href: "/inventory/import" },
        ],
      },
    ],
  },
  {
    key: "accounting",
    label: "Accounting",
    href: "/accounting",
    sidebar: [
      {
        label: "Accounting",
        items: [
          { title: "Overview", href: "/accounting" },
          { title: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
        ],
      },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    href: "/marketing",
    sidebar: [
      {
        label: "Marketing",
        items: [
          { title: "Overview", href: "/marketing" },
          { title: "Campaigns", href: "/marketing/campaigns" },
        ],
      },
    ],
  },
  {
    key: "search",
    label: "Search",
    href: "/search",
    sidebar: [
      {
        label: "Search",
        items: [{ title: "Search", href: "/search" }],
      },
    ],
  },
];

export const getModuleKeyFromPathname = (pathname: string): ModuleKey => {
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "administrative";
  }
  if (pathname === "/search" || pathname.startsWith("/search/")) {
    return "search";
  }
  if (
    pathname === "/cycle-counting" ||
    pathname.startsWith("/cycle-counting/")
  ) {
    return "warehouse";
  }

  const match = modules.find(
    (module) =>
      pathname === module.href || pathname.startsWith(`${module.href}/`)
  );

  return match?.key ?? "calendar";
};
