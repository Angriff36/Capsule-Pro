import type { ReactNode } from "react";

interface WarehouseLayoutProperties {
  readonly children: ReactNode;
}

const WarehouseLayout = ({ children }: WarehouseLayoutProperties) => (
  <>{children}</>
);

export default WarehouseLayout;
