"use client";

import { analytics } from "@repo/analytics";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { Separator } from "@repo/design-system/components/ui/separator";
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
import { Header } from "../components/header";

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
      <CardDescription className="flex items-center gap-2">
        <CalendarDays className="size-4" />
        {item.eventDate
          ? dateFormatter.format(new Date(item.eventDate as string))
          : "No date"}
        {item.venueName ? ` · ${item.venueName}` : ""}
      </CardDescription>
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
      <CardDescription>
        {[item.first_name, item.last_name].filter(Boolean).join(" ")}
        {item.company_name ? ` · ${item.company_name}` : ""}
      </CardDescription>
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
      <CardDescription>
        {item.title ? `${item.title as string} · ` : ""}
        {(item.email as string) || (item.phone as string) || ""}
      </CardDescription>
    ),
  },
  venues: {
    label: "Venues",
    icon: <MapPin className="size-4" />,
    href: (item) => `/venues/${item.id}`,
    title: (item) => (item.name as string) || "Unknown Venue",
    description: (item) => (
      <CardDescription>
        {[item.city, item.stateProvince].filter(Boolean).join(", ")}
        {item.venueType ? ` · ${item.venueType as string}` : ""}
      </CardDescription>
    ),
  },
  inventory: {
    label: "Inventory",
    icon: <Package className="size-4" />,
    href: (item) => `/inventory/${item.id}`,
    title: (item) =>
      `${item.name}${item.item_number ? ` (${item.item_number})` : ""}`,
    description: (item) => (
      <CardDescription>
        {item.category as string}
        {item.unitOfMeasure ? ` · ${item.unitOfMeasure as string}` : ""}
      </CardDescription>
    ),
  },
  knowledge: {
    label: "Knowledge Base",
    icon: <BookOpen className="size-4" />,
    href: (item) => `/knowledge/${item.slug}`,
    title: (item) => (item.title as string) || "Untitled",
    description: (item) => (
      <CardDescription>
        {(item.category as string) || "General"}
      </CardDescription>
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
      <CardDescription>
        {(item.task_type as string) === "admin" ? "Admin" : "Kitchen"}
        {" · "}
        {item.status as string}
      </CardDescription>
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
      <>
        <Header page="Search" pages={["Building Your Application"]} />
        <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
          <Empty>
            <EmptyMedia>
              <BookOpen className="size-10 text-muted-foreground/50" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>Search</EmptyTitle>
              <EmptyDescription>
                Use the search bar to enter a search term and browse results
                across the app.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </>
    );
  }

  return (
    <>
      <Header page="Search" pages={["Building Your Application"]} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold tracking-tight">
              Search Results
            </h1>
            <p className="text-muted-foreground">
              {loading ? (
                "Searching..."
              ) : data ? (
                <>
                  {data.total} result{data.total !== 1 ? "s" : ""} for &quot;{q}
                  &quot;
                </>
              ) : (
                <>Showing results for &quot;{q}&quot;</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
        </div>

        <Separator />

        {error && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
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

        {!loading && data && data.total === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No results found.</p>
            </CardContent>
          </Card>
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
                  <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {config.icon}
                    {config.label} ({group.total})
                  </h2>
                  <div className="grid auto-rows-min gap-6 md:grid-cols-3">
                    {group.items.map((item) => (
                      <Link
                        className="group"
                        href={config.href(item)}
                        key={`${item.tenantId}-${item.id}`}
                      >
                        <Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                          <CardHeader>
                            <CardTitle className="text-base line-clamp-2">
                              {config.title(item)}
                            </CardTitle>
                            {config.description(item)}
                          </CardHeader>
                        </Card>
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
                <ChevronLeft className="size-4 mr-1" />
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
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header page="Search" pages={["Building Your Application"]} />
          <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-px w-full" />
          </div>
        </>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
