import type { ReactNode } from "react";

type CrmLayoutProperties = {
  readonly children: ReactNode;
};

const CrmLayout = ({ children }: CrmLayoutProperties) => <>{children}</>;

export default CrmLayout;
