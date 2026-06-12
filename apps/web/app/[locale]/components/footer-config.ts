export interface NavigationItem {
  description?: string;
  href?: string;
  items?: SubNavigationItem[];
  title: string;
}

export interface SubNavigationItem {
  href: string;
  title: string;
}

interface FooterLegalPage {
  _slug: string;
  _title?: string;
}

/**
 * Build footer navigation items with legal pages from CMS
 */
export function buildFooterNavigationItems(
  legalPages: FooterLegalPage[],
  docsUrl?: string
): NavigationItem[] {
  const navigationItems: NavigationItem[] = [
    {
      title: "Home",
      href: "/",
      description: "",
    },
    {
      title: "Pages",
      description: "Managing a small business today is already tough.",
      items: [
        {
          title: "Blog",
          href: "/blog",
        },
      ],
    },
    {
      title: "Legal",
      description: "We stay on top of the latest legal requirements.",
      items: legalPages.map((post) => ({
        title: post._title ?? post._slug,
        href: `/legal/${post._slug}`,
      })),
    },
  ];

  if (docsUrl) {
    navigationItems.at(1)?.items?.push({
      title: "Docs",
      href: docsUrl,
    });
  }

  return navigationItems;
}
