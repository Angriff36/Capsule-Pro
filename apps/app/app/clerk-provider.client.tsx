"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { type ReactNode, useSyncExternalStore } from "react";

export default function ClerkProviderClient({
  children,
}: {
  children: ReactNode;
}) {
  const { resolvedTheme } = useTheme();

  // Read initial theme synchronously from <html> class to avoid flash.
  // next-themes sets class="dark" via inline script before hydration,
  // so this returns the correct value on the very first render frame.
  const isDarkFromDom = useSyncExternalStore(
    () => () => {},
    () => document.documentElement.classList.contains("dark"),
    () => false
  );

  // After hydration, useTheme() takes priority; before hydration, DOM class wins
  const isDark =
    resolvedTheme === "dark" || (!resolvedTheme && isDarkFromDom);

  return (
    <ClerkProvider
      appearance={{ theme: isDark ? dark : undefined, cssLayerName: "clerk" }}
    >
      {children}
    </ClerkProvider>
  );
}
