import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type React from "react";
import type { ReactNode } from "react";

import { source } from "@/lib/source";

type DocsLayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: DocsLayoutProps): React.ReactElement => (
  <DocsLayout
    nav={{ title: "Convoy Docs", url: "/" }}
    tree={source.getPageTree()}
  >
    {children}
  </DocsLayout>
);

export default Layout;
