import type { ReactNode } from "react";
type SchedulingLayoutProperties = {
  readonly children: ReactNode;
};

const SchedulingLayout = ({ children }: SchedulingLayoutProperties) => (
  <>{children}</>
);

export default SchedulingLayout;
