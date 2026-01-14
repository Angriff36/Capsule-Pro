import type { ReactNode } from "react";
type WarehouseLayoutProperties = {
  readonly children: ReactNode;
};

const WarehouseLayout = ({ children }: WarehouseLayoutProperties) => (
  <>{children}</>
);

export default WarehouseLayout;
