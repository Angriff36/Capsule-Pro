"use client";

import { analytics } from "@repo/analytics";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  FileText,
  Leaf,
  MapPin,
  Package,
  Receipt,
  Target,
  User,
  Users,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
// NOTE: Keeping apiFetch for /api/search aggregate endpoint (no generated client)
import { apiFetch } from "@/app/lib/api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

interface SearchResult {
  groups: Record<string, { items: Record<string, unknown>[]; total: number }>;
  limit: number;
  page: number;
  total: number;
}

type SItem = Record<string, unknown>;

const ITEMS_PER_GROUP = 5;

const GROUP_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    href: (item: SItem) => string;
    title: (item: SItem) => string;
    description: (item: SItem) => React.ReactNode;
  }
> = {
  events: {
    label: "Events",
    icon: <CalendarDays className="size-4" />,
    href: (item) => `/events/${item.id}`,
    title: (item) => (item.title as string) || `Event #${item.eventNumber}`,
    description: (item) => (
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <CalendarDays className="size-4" />
        {item.eventDate
          ? dateFormatter.format(new Date(item.eventDate as string))
          : "No date"}
        {item.venueName ? ` · ${item.venueName}` : ""}
      </p>
    ),
  },
  clients: {
    label: "Clients",
    icon: <Users className="size-4" />,
    href: (item) => `/crm/clients/${item.id}`,
    title: (item) =>
      (item.company_name as string) ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Unknown Client",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {[item.first_name, item.last_name].filter(Boolean).join(" ")}
        {item.company_name ? ` · ${item.company_name}` : ""}
      </p>
    ),
  },
  contacts: {
    label: "Contacts",
    icon: <User className="size-4" />,
    href: (item) => `/crm/clients/${item.clientId}`,
    title: (item) =>
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Unknown Contact",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {item.title ? `${item.title as string} · ` : ""}
        {(item.email as string) || (item.phone as string) || ""}
      </p>
    ),
  },
  venues: {
    label: "Venues",
    icon: <MapPin className="size-4" />,
    href: (item) => `/crm/venues/${item.id}`,
    title: (item) => (item.name as string) || "Unknown Venue",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {[item.city, item.stateProvince].filter(Boolean).join(", ")}
        {item.venueType ? ` · ${item.venueType as string}` : ""}
      </p>
    ),
  },
  inventory: {
    label: "Inventory",
    icon: <Package className="size-4" />,
    href: (item) => `/inventory/items/${item.id}`,
    title: (item) =>
      `${item.name}${item.item_number ? ` (${item.item_number})` : ""}`,
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {item.category as string}
        {item.unitOfMeasure ? ` · ${item.unitOfMeasure as string}` : ""}
      </p>
    ),
  },
  knowledge: {
    label: "Knowledge Base",
    icon: <BookOpen className="size-4" />,
    href: (item) => `/knowledge-base/${item.slug}`,
    title: (item) => (item.title as string) || "Untitled",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {(item.category as string) || "General"}
      </p>
    ),
  },
  tasks: {
    label: "Tasks",
    icon: <CheckSquare className="size-4" />,
    href: (item) => {
      const taskType = item.task_type as string;
      return taskType === "admin" ? "/admin/tasks" : "/kitchen/tasks";
    },
    title: (item) => (item.title as string) || "Untitled Task",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {(item.task_type as string) === "admin" ? "Admin" : "Kitchen"}
        {" · "}
        {item.status as string}
      </p>
    ),
  },
  recipes: {
    label: "Recipes",
    icon: <ChefHat className="size-4" />,
    href: (item) => `/kitchen/recipes/${item.id}`,
    title: (item) => (item.name as string) || "Untitled Recipe",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {item.category as string}
        {item.cuisineType ? ` · ${item.cuisineType as string}` : ""}
      </p>
    ),
  },
  dishes: {
    label: "Dishes",
    icon: <UtensilsCrossed className="size-4" />,
    href: (item) => `/kitchen/recipes/dishes/${item.id}`,
    title: (item) => (item.name as string) || "Untitled Dish",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {item.category as string}
        {item.serviceStyle ? ` · ${item.serviceStyle as string}` : ""}
      </p>
    ),
  },
  equipment: {
    label: "Equipment",
    icon: <Wrench className="size-4" />,
    href: (_item) => "/kitchen/equipment",
    title: (item) => (item.name as string) || "Unknown Equipment",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {item.type as string}
        {item.manufacturer ? ` · ${item.manufacturer as string}` : ""}
      </p>
    ),
  },
  ingredients: {
    label: "Ingredients",
    icon: <Leaf className="size-4" />,
    href: (_item) => "/kitchen/recipes?tab=ingredients",
    title: (item) => (item.name as string) || "Unknown Ingredient",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {(item.category as string) || "Uncategorized"}
      </p>
    ),
  },
  menus: {
    label: "Menus",
    icon: <BookOpen className="size-4" />,
    href: (item) => `/kitchen/recipes/menus/${item.id}`,
    title: (item) => (item.name as string) || "Untitled Menu",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {(item.category as string) || "General"}
      </p>
    ),
  },
  leads: {
    label: "Leads",
    icon: <Target className="size-4" />,
    href: (item) => `/marketing/leads/${item.id}`,
    title: (item) =>
      (item.companyName as string) ||
      (item.contactName as string) ||
      "Unknown Lead",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {(item.contactName as string) || ""}
        {item.source ? ` · ${(item.source as string).replace("_", " ")}` : ""}
      </p>
    ),
  },
  proposals: {
    label: "Proposals",
    icon: <FileText className="size-4" />,
    href: (item) => `/crm/proposals/${item.id}`,
    title: (item) =>
      (item.title as string) || `Proposal #${item.proposalNumber}`,
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {item.proposalNumber as string}
        {item.eventType ? ` · ${item.eventType as string}` : ""}
      </p>
    ),
  },
  invoices: {
    label: "Invoices",
    icon: <Receipt className="size-4" />,
    href: (item) => `/accounting/invoices/${item.id}`,
    title: (item) =>
      item.invoiceNumber
        ? `Invoice ${item.invoiceNumber as string}`
        : "Unknown Invoice",
    description: (item) => (
      <p className="text-muted-foreground text-sm">
        {(item.invoiceType as string) || ""}
        {item.total ? ` · $${Number(item.total).toFixed(2)}` : ""}
      </p>
    ),
  },
};

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") || "";
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const limit = 10;

  const fetchResults = useCallback(async () => {
    if (!q) {
      return;
    }
    setLoading(true);
    setError(null);
    analytics.capture("search:query", { query: q });
    try {
      const params = new URLSearchParams({
        q,
        page: String(page),
        limit: String(limit),
      });
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }
      const res = await apiFetch(`/api/search?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || "Search failed");
      }
    } catch {
      setError("Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }, [q, page, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [q, typeFilter]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (!q) {
    return (
      <PageCanvas>
        <CommandBand>
          <CommandBandHeader>
            <div className="space-y-4">
              <MonoLabel tone="dark">Search</MonoLabel>
              <DisplayHeading>Global Search</DisplayHeading>
              <CommandBandLede>
                Use the search bar to find events, clients, inventory, and more
                across the entire application.
              </CommandBandLede>
            </div>
          </CommandBandHeader>
        </CommandBand>
        <OperationalColumn>
          <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-10 text-center">
            <BookOpen className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-4 text-ink text-sm leading-relaxed">
              Enter a search term in the global search bar to browse results
              across the app.
            </p>
          </div>
        </OperationalColumn>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Search</MonoLabel>
            <DisplayHeading>Search Results</DisplayHeading>
            <CommandBandLede>
              {loading
                ? "Searching..."
                : data
                  ? `${data.total} result${data.total === 1 ? "" : "s"} for "${q}"`
                  : `Showing results for "${q}"`}
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <div className="flex items-center justify-end">
          <Select onValueChange={setTypeFilter} value={typeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(GROUP_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  {cfg.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-10 text-center">
            <p className="text-coral">{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="space-y-2" key={i}>
                <Skeleton className="h-5 w-24" />
                <div className="grid gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton className="h-28" key={j} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading &&
          data &&
          Object.entries(data.groups)
            .filter(([, g]) => g.total > 0)
            .map(([groupKey, group]) => {
              const config = GROUP_CONFIG[groupKey];
              if (!config) {
                return null;
              }
              return (
                <section className="space-y-4" key={groupKey}>
                  <SectionHeader
                    count={`${group.total} result${group.total === 1 ? "" : "s"}`}
                    eyebrow={config.label}
                    title={config.label}
                  />
                  <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    {group.items.map((item) => (
                      <Link
                        className="group"
                        href={config.href(item)}
                        key={`${item.tenantId}-${item.id}`}
                      >
                        <div className="h-full rounded-[22px] border border-hairline bg-canvas p-5 transition hover:border-primary/40">
                          <p className="line-clamp-2 font-semibold">
                            {config.title(item)}
                          </p>
                          {config.description(item)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}

        {!loading &&
          data &&
          Object.values(data.groups).some((g) => g.total > ITEMS_PER_GROUP) && (
            <div className="flex items-center justify-center gap-4">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                size="sm"
                variant="outline"
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {data.page}
              </span>
              <Button
                disabled={page * data.limit >= data.total}
                onClick={() => setPage((p) => p + 1)}
                size="sm"
                variant="outline"
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          )}
      </OperationalColumn>
    </PageCanvas>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <PageCanvas>
          <CommandBand>
            <CommandBandHeader>
              <div className="space-y-4">
                <MonoLabel tone="dark">Search</MonoLabel>
                <DisplayHeading>Search</DisplayHeading>
                <CommandBandLede>Loading...</CommandBandLede>
              </div>
            </CommandBandHeader>
          </CommandBand>
          <OperationalColumn>
            <Skeleton className="h-8 w-48" />
          </OperationalColumn>
        </PageCanvas>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
