import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Input } from "@repo/design-system/components/ui/input";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  BookOpenIcon,
  FileTextIcon,
  LightbulbIcon,
  SearchIcon,
  SettingsIcon,
  ToolIcon,
  WrenchIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/app/(authenticated)/components/header";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface KnowledgeEntryRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  tags: string[];
  difficulty_level: string | null;
  status: string;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: Date;
  updated_at: Date;
}

const categories = [
  { value: "all", label: "All", icon: BookOpenIcon },
  { value: "recipe", label: "Recipes", icon: BookOpenIcon },
  { value: "procedure", label: "Procedures", icon: FileTextIcon },
  { value: "troubleshooting", label: "Troubleshooting", icon: ToolIcon },
  { value: "best-practice", label: "Best Practices", icon: LightbulbIcon },
  { value: "equipment", label: "Equipment", icon: SettingsIcon },
  { value: "safety", label: "Safety", icon: WrenchIcon },
];

const getCategoryIcon = (category: string) => {
  const found = categories.find((c) => c.value === category);
  return found?.icon ?? BookOpenIcon;
};

const KnowledgeBasePage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; category?: string }>;
}) => {
  const params = searchParams ? await searchParams : {};
  const query = params.q?.trim() ?? "";
  const category = params.category ?? "all";

  const { orgId, userId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get counts by category
  const [categoryCounts] = await database.$queryRaw<
    Array<{ category: string; count: number }>
  >(
    database.$queryRaw`
      SELECT category, COUNT(*)::int AS count
      FROM tenant_kitchen.knowledge_entries
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status = 'published'
      GROUP BY category
    `
  );

  const countMap = new Map(categoryCounts.map((c) => [c.category, c.count]));

  const totalEntries = Array.from(countMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  // Fetch entries with filtering
  const entries = await database.knowledgeEntry.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: "published",
      ...(category !== "all" ? { category } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { content: { contains: query, mode: "insensitive" } },
              { excerpt: { contains: query, mode: "insensitive" } },
              { tags: { has: query } },
            ],
          }
        : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      category: true,
      tags: true,
      difficultyLevel: true,
      status: true,
      isFeatured: true,
      viewCount: true,
      helpfulCount: true,
      notHelpfulCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const helpfulRating = (entry: KnowledgeEntryRow) => {
    const total = entry.helpful_count + entry.not_helpful_count;
    if (total === 0) return null;
    return Math.round((entry.helpful_count / total) * 100);
  };

  return (
    <>
      <Header page="Knowledge Base" pages={["Kitchen Ops"]}>
        <div className="flex items-center gap-2 px-4">
          <Button size="icon" variant="ghost">
            <SettingsIcon className="size-4" />
          </Button>
        </div>
      </Header>
      <Separator />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Search and Filter Section */}
        <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <form className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={query}
                name="q"
                placeholder="Search knowledge base..."
                type="search"
              />
            </form>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = category === cat.value;
                const count =
                  cat.value === "all"
                    ? totalEntries
                    : (countMap.get(cat.value) ?? 0);

                return (
                  <Link
                    href={`/knowledge-base?category=${cat.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                    key={cat.value}
                  >
                    <Button
                      className="gap-2"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                    >
                      <Icon className="size-4" />
                      {cat.label}
                      {count > 0 && (
                        <Badge
                          className="ml-1"
                          variant={isActive ? "secondary" : "outline"}
                        >
                          {count}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Knowledge Entries Grid */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-sm text-muted-foreground">
              {category === "all"
                ? `All Entries (${entries.length})`
                : `${categories.find((c) => c.value === category)?.label ?? category} (${entries.length})`}
            </h2>
            {query && (
              <div className="text-muted-foreground text-sm">
                Results for "{query}"
              </div>
            )}
          </div>
          <div className="rounded-3xl border bg-muted/40 p-4">
            {entries.length === 0 ? (
              <Empty className="bg-card/50">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BookOpenIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    {query
                      ? "No matching entries found"
                      : "Start your knowledge base"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {query
                      ? `No entries match your search for "${query}". Try different keywords or browse categories.`
                      : "Build your team's centralized knowledge repository. Document recipes, procedures, troubleshooting guides, and best practices."}
                  </EmptyDescription>
                </EmptyHeader>
                {!query && (
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/knowledge-base/new">Create First Entry</Link>
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {entries.map((entry) => {
                  const Icon = getCategoryIcon(entry.category);
                  const rating = helpfulRating(entry);

                  return (
                    <Card
                      className="group overflow-hidden shadow-sm transition-all hover:shadow-md"
                      key={entry.id}
                    >
                      <Link href={`/knowledge-base/${entry.slug}`}>
                        <CardHeader className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap gap-2">
                              {entry.is_featured && (
                                <Badge variant="default">Featured</Badge>
                              )}
                              <Badge className="gap-1" variant="secondary">
                                <Icon className="size-3" />
                                {entry.category}
                              </Badge>
                              {entry.difficulty_level && (
                                <Badge variant="outline">
                                  {entry.difficulty_level}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardTitle className="font-semibold text-lg line-clamp-2">
                            {entry.title}
                          </CardTitle>
                          {entry.excerpt && (
                            <p className="line-clamp-2 text-muted-foreground text-sm">
                              {entry.excerpt}
                            </p>
                          )}
                        </CardHeader>
                      </Link>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.slice(0, 3).map((tag) => (
                            <Badge
                              className="text-xs"
                              key={tag}
                              variant="outline"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags.length > 3 && (
                            <Badge className="text-xs" variant="outline">
                              +{entry.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                        {rating !== null && (
                          <div className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
                            <span>{rating}% helpful</span>
                            <span>•</span>
                            <span>{entry.view_count} views</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default KnowledgeBasePage;
