"use client";

import type { ReactNode } from "react";

interface AuthProviderProperties {
  children: ReactNode;
  helpUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

export const AuthProvider = ({ children }: AuthProviderProperties) => {
  // Intentionally does NOT render <ClerkProvider>.
  // ClerkProvider must exist exactly once in the app root.
  return <>{children}</>;
};
