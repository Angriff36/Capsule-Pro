"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useState } from "react";

export default function ClerkProviderClient({
  children,
}: {
  children: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to undefined (light) during SSR to avoid hydration mismatch
  const theme = mounted && resolvedTheme === "dark" ? dark : undefined;

  return (
    <ClerkProvider appearance={{ theme, cssLayerName: "clerk" }}>
      {children}
    </ClerkProvider>
  );
}
