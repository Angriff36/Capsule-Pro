import type { ReactNode } from "react";
type ModuleNavItem = {
  title: string;
  href: string;
};
type ModuleShellProperties = {
  title: string;
  navItems: ModuleNavItem[];
  children: ReactNode;
};
export declare const ModuleShell: ({
  title,
  navItems,
  children,
}: ModuleShellProperties) => import("react").JSX.Element;
//# sourceMappingURL=module-shell.d.ts.map
