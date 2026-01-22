import type { ReactNode } from "react";

type SettingsLayoutProperties = {
  readonly children: ReactNode;
};

const SettingsLayout = ({ children }: SettingsLayoutProperties) => (
  <>{children}</>
);

export default SettingsLayout;
