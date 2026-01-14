import type { ReactNode } from "react";
type AdministrativeLayoutProperties = {
  readonly children: ReactNode;
};

const AdministrativeLayout = ({ children }: AdministrativeLayoutProperties) => (
  <>{children}</>
);

export default AdministrativeLayout;
