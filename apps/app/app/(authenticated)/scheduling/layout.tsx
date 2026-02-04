import type { ReactNode } from "react";

interface SchedulingLayoutProperties {
  readonly children: ReactNode;
}

const SchedulingLayout = ({ children }: SchedulingLayoutProperties) => (
  <>{children}</>
);

export default SchedulingLayout;
