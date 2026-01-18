import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

import { source } from '@/lib/source';

type DocsLayoutProps = {
  children: ReactNode;
};

const Layout = ({ children }: DocsLayoutProps) => (
  <DocsLayout
    tree={source.getPageTree()}
    nav={{ title: 'Convoy Docs', url: '/' }}
  >
    {children}
  </DocsLayout>
);

export default Layout;
