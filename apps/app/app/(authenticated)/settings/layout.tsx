import type { ReactNode } from "react";

interface SettingsLayoutProperties {
  readonly children: ReactNode;
}

const SettingsLayout = ({ children }: SettingsLayoutProperties) => (
  <>{children}</>
);

export default SettingsLayout;
