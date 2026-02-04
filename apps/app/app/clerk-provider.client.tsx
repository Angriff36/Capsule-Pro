"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

export default function ClerkProviderClient({
  children,
}: {
  children: ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const baseTheme = resolvedTheme === "dark" ? dark : undefined;

  return <ClerkProvider appearance={{ baseTheme }}>{children}</ClerkProvider>;
}
