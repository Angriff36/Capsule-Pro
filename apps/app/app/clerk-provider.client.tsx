"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "@repo/design-system";
import type { ReactNode } from "react";

export default function ClerkProviderClient({
  children,
}: {
  children: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? dark : undefined;

  return (
    <ClerkProvider appearance={{ theme, cssLayerName: "clerk" }}>
      {children}
    </ClerkProvider>
  );
}
