"use client";

import { analytics } from "@repo/analytics";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
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
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

interface SearchResult {
  groups: Record<string, { items: Record<string, unknown>[]; total: number }>;
  total: number;
  page: number;
  limit: number;
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
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
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
    href: (item) => `/clients/${item.id}`,
    title: (item) =>
      (item.company_name as string) ||
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Unknown Client",
    description: (item) => (
      <p className="text-sm text-muted-foreground">
        {[item.first_name, item.last_name].filter(Boolean).join(" ")}
        {item.company_name ? ` · ${item.company_name}` : ""}
      </p>
    ),
  },
  contacts: {
    label: "Contacts",
    icon: <User className="size-4" />,
    href: (item) => `/clients/${item.clientId}`,
    title: (item) =>
      [item.first_name, item.last_name].filter(Boolean).join(" ") ||
      "Unknown Contact",
    description: (item) => (
      <p className="text-sm text-muted-foreground">
        {item.title ? `${item.title as string} · ` : ""}
        {(item.email as string) || (item.phone as string) || ""}
      </p>
    ),
  },
  venues: {
    label: "Venues",
    icon: <MapPin className="size-4" />,
    href: (item) => `/venues/${item.id}`,
    title: (item) => (item.name as string) || "Unknown Venue",
    description: (item) => (
      <p className="text-sm text-muted-foreground">
        {[item.city, item.stateProvince].filter(Boolean).join(", ")}
        {item.venueType ? ` · ${item.venueType as string}` : ""}
      </p>
    ),
  },
  inventory: {
    label: "Inventory",
    icon: <Package className="size-4" />,
    href: (item) => `/inventory/${item.id}`,
    title: (item) =>
      `${item.name}${item.item_number ? ` (${item.item_number})` : ""}`,
    description: (item) => (
      <p className="text-sm text-muted-foreground">
        {item.category as string}
        {item.unitOfMeasure ? ` · ${item.unitOfMeasure as string}` : ""}
      </p>
    ),
  },
  knowledge: {
    label: "Knowledge Base",
    icon: <BookOpen className="size-4" />,
    href: (item) => `/knowledge/${item.slug}`,
    title: (item) => (item.title as string) || "Untitled",
    description: (item) => (
      <p className="text-sm text-muted-foreground">
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
      <p className="text-sm text-muted-foreground">
        {(item.task_type as string) === "admin" ? "Admin" : "Kitchen"}
        {" · "}
        {item.status as string}
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
    if (!q) return;
    setLoading(true);
    setError(null);
    analytics.capture("search:query", { query: q });
    try {
      const params = new URLSearchParams({
        q,
        page: String(page),
        limit: String(limit),
      });
      if (typeFilter !== "all") params.set("type", typeFilter);
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
                  ? `${data.total} result${data.total !== 1 ? "s" : ""} for "${q}"`
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
              if (!config) return null;
              return (
                <section className="space-y-4" key={groupKey}>
                  <SectionHeader
                    count={`${group.total} result${group.total !== 1 ? "s" : ""}`}
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
              <span className="text-sm text-muted-foreground">
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
