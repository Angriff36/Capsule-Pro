import type { ReactNode } from "react";

interface AdministrativeLayoutProperties {
  readonly children: ReactNode;
}

const AdministrativeLayout = ({ children }: AdministrativeLayoutProperties) => (
  <>{children}</>
);

export default AdministrativeLayout;
