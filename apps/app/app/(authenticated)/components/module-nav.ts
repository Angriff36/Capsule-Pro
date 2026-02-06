export type ModuleKey =
  | "events"
  | "kitchen"
  | "warehouse"
  | "scheduling"
  | "staff"
  | "payroll"
  | "administrative"
  | "crm"
  | "analytics";

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
    key: "events",
    label: "Events",
    href: "/events",
    sidebar: [
      {
        label: "Events",
        items: [
          { title: "All Events", href: "/events" },
          { title: "Kitchen Dashboard", href: "/events/kitchen-dashboard" },
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
          { title: "Team", href: "/staff/team" },
          { title: "Schedule", href: "/staff/schedule" },
          { title: "Availability", href: "/staff/availability" },
          { title: "Time Off", href: "/staff/time-off" },
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
          { title: "Clients", href: "/crm/clients" },
          { title: "Venues", href: "/crm/venues" },
          { title: "Communications", href: "/crm/communications" },
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
        ],
      },
    ],
  },
];

export const getModuleKeyFromPathname = (pathname: string): ModuleKey => {
  const match = modules.find(
    (module) =>
      pathname === module.href || pathname.startsWith(`${module.href}/`)
  );

  return match?.key ?? "events";
};
