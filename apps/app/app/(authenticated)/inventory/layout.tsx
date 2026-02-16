import type { ReactNode } from "react";

interface InventoryLayoutProperties {
  readonly children: ReactNode;
}

const InventoryLayout = ({ children }: InventoryLayoutProperties) => (
  <>{children}</>
);

export default InventoryLayout;
