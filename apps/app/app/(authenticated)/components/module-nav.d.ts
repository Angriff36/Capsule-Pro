export type ModuleKey =
  | "events"
  | "kitchen"
  | "warehouse"
  | "scheduling"
  | "payroll"
  | "administrative"
  | "crm"
  | "analytics";
type ModuleSidebarItem = {
  title: string;
  href?: string;
};
type ModuleSidebarSection = {
  label: string;
  items: ModuleSidebarItem[];
};
export type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  href: string;
  sidebar: ModuleSidebarSection[];
};
export declare const modules: ModuleDefinition[];
export declare const getModuleKeyFromPathname: (pathname: string) => ModuleKey;
//# sourceMappingURL=module-nav.d.ts.map
