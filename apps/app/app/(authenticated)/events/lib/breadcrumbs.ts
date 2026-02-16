/** A single breadcrumb entry used by the Header component. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Maps URL path segments to readable breadcrumb labels
 * for the Events module.
 */
const EVENT_SUBPAGE_LABELS: Record<string, string> = {
  "battle-board": "Battle Board",
  "battle-boards": "Battle Boards",
  budgets: "Budgets",
  budget: "Budget",
  contracts: "Contracts",
  "kitchen-dashboard": "Kitchen Dashboard",
  reports: "Reports",
  import: "Imports",
  new: "New Event",
};

/**
 * Generates breadcrumb items from a URL pathname for the Events module.
 *
 * This function parses the URL path and generates appropriate breadcrumb
 * items based on the module structure defined in module-nav.ts.
 *
 * For dynamic segments (like [eventId], [boardId]), this function returns
 * the segment as a label - the caller should replace these with actual
 * titles where needed.
 *
 * @param pathname - The current URL pathname (e.g., "/events/123/battle-board")
 * @param currentPageLabel - Optional override for the current page label
 * @returns Array of BreadcrumbItem objects for the Header component
 */
export function generateEventBreadcrumbs(
  pathname: string,
  currentPageLabel?: string
): BreadcrumbItem[] {
  // Normalize pathname - remove trailing slashes and split
  const segments = pathname.split("/").filter(Boolean);

  // If we're at the root of the module (/events), return empty
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "events")) {
    return [];
  }

  // Start with the module root
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Events", href: "/events" },
  ];

  // Process each segment after /events
  const eventSegments = segments.slice(1);

  for (let i = 0; i < eventSegments.length; i++) {
    const segment = eventSegments[i];

    // Skip UUIDs and numeric IDs - they're dynamic, caller handles labels
    const isDynamicSegment =
      /^[0-9a-f-]{36}$/i.test(segment) || // UUID
      /^\d+$/.test(segment); // Numeric ID

    if (isDynamicSegment) {
      // For dynamic segments, we can't know the label - skip adding to breadcrumbs
      // The caller should pass the actual title via currentPageLabel
      continue;
    }

    // Check if this segment has a known label
    const knownLabel = EVENT_SUBPAGE_LABELS[segment];

    if (knownLabel) {
      // Determine if this is the current page (last segment)
      const isCurrentPage = i === eventSegments.length - 1;

      if (isCurrentPage && currentPageLabel) {
        // Use provided label for current page (usually a dynamic title)
        breadcrumbs.push({ label: currentPageLabel });
      } else {
        // Add as a parent link
        const href = `/events/${eventSegments.slice(0, i + 1).join("/")}`;
        breadcrumbs.push({ label: knownLabel, href });
      }
    }
  }

  // If there's a currentPageLabel and we haven't added it yet, add it now
  if (currentPageLabel) {
    const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
    if (lastBreadcrumb?.label !== currentPageLabel && lastBreadcrumb?.href) {
      breadcrumbs.push({ label: currentPageLabel });
    }
  }

  return breadcrumbs;
}
