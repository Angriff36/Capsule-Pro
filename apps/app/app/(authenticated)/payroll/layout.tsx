import type { ReactNode } from "react";

type PayrollLayoutProperties = {
  readonly children: ReactNode;
};

const PayrollLayout = ({ children }: PayrollLayoutProperties) => (
  <>{children}</>
);

export default PayrollLayout;
