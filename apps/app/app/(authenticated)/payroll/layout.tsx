import type { ReactNode } from "react";

interface PayrollLayoutProperties {
  readonly children: ReactNode;
}

const PayrollLayout = ({ children }: PayrollLayoutProperties) => (
  <>{children}</>
);

export default PayrollLayout;
