import type { ThemeProviderProps } from "next-themes";
type DesignSystemProviderProperties = ThemeProviderProps & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};
export declare const DesignSystemProvider: ({
  children,
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}: DesignSystemProviderProperties) => import("react").JSX.Element;
//# sourceMappingURL=index.d.ts.map
