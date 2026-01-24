import "./styles.css";
import type { ReactNode } from "react";
type RootLayoutProperties = {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
};
declare const RootLayout: ({
  children,
  params,
}: RootLayoutProperties) => Promise<import("react").JSX.Element>;
export default RootLayout;
//# sourceMappingURL=layout.d.ts.map
