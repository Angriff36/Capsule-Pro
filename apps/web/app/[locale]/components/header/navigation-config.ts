import type { Dictionary } from "@repo/internationalization";

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

/**
 * Build navigation items from dictionary and environment config
 */
export function buildNavigationItems(
  dictionary: Dictionary,
  docsUrl?: string
): NavigationItem[] {
  const navigationItems: NavigationItem[] = [
    {
      title: dictionary.web.header.home,
      href: "/",
      description: "",
    },
    {
      title: dictionary.web.header.product.title,
      description: dictionary.web.header.product.description,
      items: [
        {
          title: dictionary.web.header.product.pricing,
          href: "/pricing",
        },
      ],
    },
    {
      title: dictionary.web.header.blog,
      href: "/blog",
      description: "",
    },
  ];

  if (docsUrl) {
    navigationItems.push({
      title: dictionary.web.header.docs,
      href: docsUrl,
      description: "",
    });
  }

  return navigationItems;
}
