import type { LegalPost } from "@repo/cms";

export interface NavigationItem {
  title: string;
  href?: string;
  description?: string;
  items?: SubNavigationItem[];
}

export interface SubNavigationItem {
  title: string;
  href: string;
}

/**
 * Build footer navigation items with legal pages from CMS
 */
export function buildFooterNavigationItems(
  legalPages: LegalPost[],
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
        title: post._title,
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
