import type { ReactNode } from "react";

interface KitchenLayoutProperties {
  readonly children: ReactNode;
}

const KitchenLayout = ({ children }: KitchenLayoutProperties) => (
  <>{children}</>
);

export default KitchenLayout;
