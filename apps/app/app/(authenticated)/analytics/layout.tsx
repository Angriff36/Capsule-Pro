import type { ReactNode } from "react";

interface AnalyticsLayoutProperties {
  readonly children: ReactNode;
}

const AnalyticsLayout = ({ children }: AnalyticsLayoutProperties) => (
  <>{children}</>
);

export default AnalyticsLayout;
