import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

import "./globals.css";

type RootLayoutProps = Readonly<{ children: ReactNode }>;

export default function RootLayout(props: RootLayoutProps): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <RootProvider>{props.children}</RootProvider>
      </body>
    </html>
  );
}
