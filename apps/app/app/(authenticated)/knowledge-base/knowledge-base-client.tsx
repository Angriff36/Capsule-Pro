"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ArrowUpRight, FileText, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  knowledgeBaseEntryCreate,
  knowledgeBaseEntryPublishEntry,
  listKnowledgeBaseEntries,
} from "@/app/lib/manifest-client.generated";

interface KnowledgeBaseEntry {
  category: string | null;
  content: string | null;
  createdAt: string;
  id: string;
  publishedAt: string | null;
  slug: string;
  status: string;
  tags: string[] | null;
  title: string;
}

export default function KnowledgeBaseClient() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    slug: "",
    content: "",
    category: "",
    tags: "",
    status: "draft",
  });

  useEffect(() => {
    fetchEntries();
  }, [search, selectedCategory]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const query: Record<string, string | number> = { status: "published" };
      if (search) {
        query.search = search;
      }
      if (selectedCategory) {
        query.category = selectedCategory;
      }

      const result = await listKnowledgeBaseEntries(query);
      setEntries(result.data as unknown as KnowledgeBaseEntry[]);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
      toast.error("Failed to load knowledge base articles");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    ...new Set(entries.map((e) => e.category).filter(Boolean)),
  ] as string[];

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(createForm.title.trim() && createForm.slug.trim())) {
      return;
    }

    setCreating(true);
    try {
      const created = await knowledgeBaseEntryCreate({
        title: createForm.title,
        content: createForm.content || undefined,
        category: createForm.category || undefined,
        tags: createForm.tags
          ? createForm.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
      });
      // Entries are created as drafts; honor the form's status choice with the
      // governed publish command, then refetch (the list shows published only).
      if (createForm.status === "published" && created?.id) {
        await knowledgeBaseEntryPublishEntry({ id: created.id });
        await fetchEntries();
      }
      setShowCreateDialog(false);
      setCreateForm({
        title: "",
        slug: "",
        content: "",
        category: "",
        tags: "",
        status: "draft",
      });
      toast.success("Article created");
    } catch (error) {
      console.error("Failed to create article:", error);
      toast.error("Failed to create article");
    } finally {
      setCreating(false);
    }
  };

  const totalEntries = entries.length;
  const taggedEntries = entries.filter(
    (e) => e.tags && e.tags.length > 0
  ).length;
  const draftCount = entries.filter((e) => e.status !== "published").length;

  const stats = [
    {
      label: "Articles",
      value: String(totalEntries),
      note: search || selectedCategory ? "In current view" : "Published",
    },
    {
      label: "Categories",
      value: String(categories.length),
      note: "Distinct buckets",
    },
    {
      label: "Tagged",
      value: String(taggedEntries),
      note: "With searchable tags",
    },
    {
      label: "Drafts",
      value: String(draftCount),
      note: "Not yet published",
    },
  ];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Knowledge base</MonoLabel>
            <DisplayHeading>Training, SOPs, and house playbooks</DisplayHeading>
            <CommandBandLede>
              The single library for staff training and operating procedures.
              Tag, search, and ship articles your team can find without
              guessing.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              onClick={() => setShowCreateDialog(true)}
              size="default"
              variant="on-dark"
            >
              <Plus className="mr-2 h-4 w-4" />
              New article
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {stats.map((item) => (
              <MetricCell key={item.label}>
                <MetricLabel>{item.label}</MetricLabel>
                <MetricValue>{item.value}</MetricValue>
                <div className="text-white/55 text-xs">{item.note}</div>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            count={`${totalEntries} articles`}
            description="Search across the library or filter by category."
            eyebrow="Library"
            title="Articles"
          />

          <div className="flex flex-col gap-3 rounded-[22px] border border-hairline bg-canvas p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search knowledge base"
                className="pl-9"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search knowledge base..."
                type="text"
                value={search}
              />
            </div>
            <Select
              onValueChange={(v) =>
                setSelectedCategory(v === "__all" ? null : v)
              }
              value={selectedCategory ?? "__all"}
            >
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="rounded-[22px] border border-hairline bg-canvas p-12 text-center text-muted-foreground text-sm">
              Loading articles...
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-[22px] border border-hairline bg-canvas p-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 font-medium text-ink text-sm">
                No articles found
              </p>
              <p className="mt-1 text-muted-foreground text-sm">
                Adjust your filters, or publish your first article.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <a
                  className="group block rounded-[22px] border border-hairline bg-canvas p-6 transition-colors hover:border-ink"
                  href={`/knowledge-base/${entry.slug}`}
                  key={entry.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    {entry.category ? (
                      <span className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                        {entry.category}
                      </span>
                    ) : (
                      <span />
                    )}
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-ink" />
                  </div>
                  <h3 className="mt-4 font-medium text-ink text-lg leading-tight">
                    {entry.title}
                  </h3>
                  {entry.content ? (
                    <p className="mt-2 line-clamp-3 text-muted-foreground text-sm leading-relaxed">
                      {entry.content.slice(0, 180)}...
                    </p>
                  ) : null}
                  {entry.tags && entry.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {entry.tags.slice(0, 4).map((tag) => (
                        <span
                          className="rounded-full border border-hairline px-2 py-0.5 text-muted-foreground text-xs"
                          key={tag}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </a>
              ))}
            </div>
          )}
        </section>
      </OperationalColumn>

      <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create new article</DialogTitle>
            <DialogDescription>
              Add a new article to the knowledge base for staff training.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateArticle}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  onChange={(e) => {
                    setCreateForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }));
                    if (!createForm.slug) {
                      setCreateForm((prev) => ({
                        ...prev,
                        slug: generateSlug(e.target.value),
                      }));
                    }
                  }}
                  placeholder="e.g., How to handle customer complaints"
                  required
                  value={createForm.title}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="auto-generated-from-title"
                  required
                  value={createForm.slug}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="e.g., Training, SOPs, Policies"
                  value={createForm.category}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  onValueChange={(v) =>
                    setCreateForm((prev) => ({ ...prev, status: v }))
                  }
                  value={createForm.status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="e.g., training, onboarding, safety"
                value={createForm.tags}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder="Write your article content here..."
                rows={10}
                value={createForm.content}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowCreateDialog(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !(createForm.title.trim() && createForm.slug.trim()) ||
                  creating
                }
                type="submit"
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create article
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageCanvas>
  );
}
