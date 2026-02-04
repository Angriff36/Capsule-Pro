"use client";

import type { ReactNode } from "react";

interface AuthProviderProperties {
  children: ReactNode;
  privacyUrl?: string;
  termsUrl?: string;
  helpUrl?: string;
}

export const AuthProvider = ({ children }: AuthProviderProperties) => {
  // Intentionally does NOT render <ClerkProvider>.
  // ClerkProvider must exist exactly once in the app root.
  return <>{children}</>;
};
