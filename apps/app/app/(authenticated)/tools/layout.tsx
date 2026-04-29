import type { ReactNode } from "react";
type ToolsLayoutProperties = {
  readonly children: ReactNode;
};

const ToolsLayout = ({ children }: ToolsLayoutProperties) => (
  <>{children}</>
);

export default ToolsLayout;
