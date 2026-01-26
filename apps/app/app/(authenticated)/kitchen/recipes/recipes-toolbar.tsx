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
import { useMemo, useState } from "react";

type RecipesTab = {
  value: string;
  label: string;
  count?: number;
};

type RecipesToolbarProps = {
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
};

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

  const currentParams = useMemo(
    () => buildSearchParams(searchParams, {}),
    [searchParams]
  );

  const updateParams = (updates: Record<string, string | null>) => {
    const params = buildSearchParams(currentParams, updates);
    const search = params.toString();
    router.replace(search ? `?${search}` : "?");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          onValueChange={(value) => updateParams({ tab: value })}
          value={activeTab}
        >
          <TabsList className="h-10 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                className="h-10 rounded-none border-transparent border-b-2 px-4 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                key={tab.value}
                value={tab.value}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {typeof tab.count === "number" && (
                    <span className="text-muted-foreground text-xs">
                      ({tab.count})
                    </span>
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {primaryAction ? (
          <Button asChild className="gap-2">
            <Link href={primaryAction.href}>
              <PlusIcon size={16} />
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
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            className="pl-9"
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipes, dishes, or ingredients"
            value={query}
          />
        </div>
        <Select
          onValueChange={(value) =>
            updateParams({ category: value === "all" ? null : value })
          }
          value={initialCategory ?? "all"}
        >
          <SelectTrigger className="min-w-[140px] gap-2" size="default">
            <FilterIcon size={14} />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="min-w-[120px]" size="default">
            <SelectValue placeholder="Dietary" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="min-w-[120px]" size="default">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Paused</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="border-muted-foreground/30 text-muted-foreground"
          type="submit"
          variant="outline"
        >
          Apply filters
        </Button>
      </form>
    </div>
  );
};
