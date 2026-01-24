import { ClerkProvider } from "@clerk/nextjs";
import type { ComponentProps } from "react";
type AuthProviderProperties = ComponentProps<typeof ClerkProvider> & {
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
};
export declare const AuthProvider: ({
  privacyUrl,
  termsUrl,
  helpUrl,
  ...properties
}: AuthProviderProperties) => import("react").JSX.Element;
//# sourceMappingURL=provider.d.ts.map
