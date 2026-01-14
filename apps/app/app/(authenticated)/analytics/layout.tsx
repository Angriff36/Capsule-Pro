import type { ReactNode } from "react";
type AnalyticsLayoutProperties = {
  readonly children: ReactNode;
};

const AnalyticsLayout = ({ children }: AnalyticsLayoutProperties) => (
  <>{children}</>
);

export default AnalyticsLayout;
