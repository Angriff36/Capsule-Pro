import type { ReactNode } from "react";

interface CrmLayoutProperties {
  readonly children: ReactNode;
}

const CrmLayout = ({ children }: CrmLayoutProperties) => <>{children}</>;

export default CrmLayout;
