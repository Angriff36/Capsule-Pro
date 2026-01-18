import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

import './globals.css';

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" suppressHydrationWarning>
    <body className="min-h-screen bg-background text-foreground">
      <RootProvider>{children}</RootProvider>
    </body>
  </html>
);

export default RootLayout;
