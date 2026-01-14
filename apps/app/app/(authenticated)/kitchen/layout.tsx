import type { ReactNode } from "react";
type KitchenLayoutProperties = {
  readonly children: ReactNode;
};

const KitchenLayout = ({ children }: KitchenLayoutProperties) => (
  <>{children}</>
);

export default KitchenLayout;
