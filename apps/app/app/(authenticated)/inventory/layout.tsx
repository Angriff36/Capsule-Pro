import type { ReactNode } from "react";

type InventoryLayoutProperties = {
  readonly children: ReactNode;
};

const InventoryLayout = ({ children }: InventoryLayoutProperties) => (
  <>{children}</>
);

export default InventoryLayout;
