"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { FilterIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface RecipesTab {
  value: string;
  label: string;
  count?: number;
}

interface RecipesToolbarProps {
  tabs: RecipesTab[];
  activeTab: string;
  initialQuery?: string;
  initialCategory?: string;
  initialDietary?: string;
  initialStatus?: string;
  primaryAction?: {
    label: string;
    href: string;
  };
}

const buildSearchParams = (
  current: URLSearchParams,
  updates: Record<string, string | null>
) => {
  const params = new URLSearchParams(current.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) {
      params.delete(key);
      return;
    }
    params.set(key, value);
  });
  return params;
};

export const RecipesToolbar = ({
  tabs,
  activeTab,
  initialQuery,
  initialCategory,
  initialDietary,
  initialStatus,
  primaryAction,
}: RecipesToolbarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const [query, setQuery] = useState(initialQuery ?? "");
  const [isMounted, setIsMounted] = useState(false);
  const tabsId = "recipes-tabs";

  const currentParams = useMemo(
    () => buildSearchParams(searchParams, {}),
    [searchParams]
  );

  const updateParams = (updates: Record<string, string | null>) => {
    const params = buildSearchParams(currentParams, updates);
    const search = params.toString();
    router.replace(search ? `?${search}` : "?");
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const triggerClass =
    "h-10 min-w-[140px] gap-2 rounded-full border border-border bg-background px-4 font-medium text-[13px] text-foreground shadow-none transition-colors hover:border-ink/20 focus:ring-2 focus:ring-ring/40 focus:ring-offset-0 data-[placeholder]:text-muted-foreground";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          onValueChange={(value) => updateParams({ tab: value })}
          value={activeTab}
        >
          <TabsList className="h-auto gap-1 rounded-full border border-hairline bg-soft-stone p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                aria-controls={`${tabsId}-content-${tab.value}`}
                className="h-8 rounded-full border-0 bg-transparent px-4 font-medium text-[13px] text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-ink data-[state=active]:text-white"
                id={`${tabsId}-trigger-${tab.value}`}
                key={tab.value}
                value={tab.value}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {typeof tab.count === "number" && (
                    <span className="font-mono text-[11px] tracking-[0.4px] opacity-70">
                      {tab.count}
                    </span>
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {primaryAction ? (
          <Button
            asChild
            className="h-10 gap-2 rounded-full bg-ink px-5 font-medium text-[13px] text-white transition-colors hover:bg-ink/90"
          >
            <Link href={primaryAction.href}>
              <PlusIcon size={14} />
              {primaryAction.label}
            </Link>
          </Button>
        ) : null}
      </div>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q: query || null });
        }}
      >
        <div className="relative min-w-[240px] flex-1">
          <SearchIcon
            className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            className="h-10 rounded-full border-border bg-background pl-10 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipes, dishes, or ingredients"
            value={query}
          />
        </div>
        {isMounted ? (
          <>
            <Select
              onValueChange={(value) =>
                updateParams({ category: value === "all" ? null : value })
              }
              value={initialCategory ?? "all"}
            >
              <SelectTrigger
                className={triggerClass}
                id="recipes-filter-category"
                size="default"
              >
                <FilterIcon className="text-muted-foreground" size={14} />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="editorial-surface-reset z-50 rounded-[16px] border border-border bg-popover shadow-md">
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="main course">Main course</SelectItem>
                <SelectItem value="appetizer">Appetizer</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
                <SelectItem value="side">Side</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                updateParams({ dietary: value === "all" ? null : value })
              }
              value={initialDietary ?? "all"}
            >
              <SelectTrigger
                className={triggerClass}
                id="recipes-filter-dietary"
                size="default"
              >
                <SelectValue placeholder="Dietary" />
              </SelectTrigger>
              <SelectContent className="editorial-surface-reset z-50 rounded-[16px] border border-border bg-popover shadow-md">
                <SelectItem value="all">Dietary</SelectItem>
                <SelectItem value="gf">Gluten free</SelectItem>
                <SelectItem value="v">Vegetarian</SelectItem>
                <SelectItem value="vg">Vegan</SelectItem>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                updateParams({ status: value === "all" ? null : value })
              }
              value={initialStatus ?? "all"}
            >
              <SelectTrigger
                className={triggerClass}
                id="recipes-filter-status"
                size="default"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="editorial-surface-reset z-50 rounded-[16px] border border-border bg-popover shadow-md">
                <SelectItem value="all">Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Paused</SelectItem>
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            <div className="h-10 min-w-[140px] rounded-full border border-border bg-background" />
            <div className="h-10 min-w-[140px] rounded-full border border-border bg-background" />
            <div className="h-10 min-w-[140px] rounded-full border border-border bg-background" />
          </>
        )}
        <Button
          className="h-10 rounded-full border border-border bg-background px-5 font-medium text-[13px] text-foreground shadow-none transition-colors hover:border-ink/20 hover:bg-soft-stone"
          type="submit"
          variant="outline"
        >
          Apply filters
        </Button>
      </form>
    </div>
  );
};
