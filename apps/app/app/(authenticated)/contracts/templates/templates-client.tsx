/**
 * @module TemplatesClient
 * @intent Interactive contract templates list with type filters, search, and create dialog
 * @responsibility Render template cards with client-side filtering and empty state
 * @domain Contracts
 * @tags contracts, templates, client-component
 * @canonical true
 */

"use client";

import { BlogFilterChip } from "@repo/design-system/components/blocks/blog-filter-chip";
import { MonoLabel } from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Calendar, FileText, Plus, Search, Store } from "lucide-react";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateType = "event" | "vendor";

interface ContractTemplate {
  id: string;
  name: string;
  type: TemplateType;
  description: string | null;
  usageCount: number;
  lastModified: string;
  createdAt: string;
}

interface TemplatesClientProps {
  templates: ContractTemplate[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const TYPE_CONFIG: Record<
  TemplateType,
  { label: string; icon: typeof Calendar; badgeClass: string }
> = {
  event: {
    label: "Event",
    icon: Calendar,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  vendor: {
    label: "Vendor",
    icon: Store,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplatesClient({ templates }: TemplatesClientProps) {
  const [typeFilter, setTypeFilter] = useState<"all" | TemplateType>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = templates;

    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [templates, typeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Search and actions bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            className="w-full rounded-md border border-hairline bg-canvas py-2 pl-10 pr-4 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-[var(--ds-coral-soft)]"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            type="text"
            value={search}
          />
        </div>

        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Contract Template</DialogTitle>
              <DialogDescription>
                Define a reusable template for event or vendor contracts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-ink"
                  htmlFor="template-name"
                >
                  Template Name
                </label>
                <Input
                  id="template-name"
                  placeholder="e.g. Standard Event Agreement"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-ink"
                  htmlFor="template-type"
                >
                  Type
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event Contract</SelectItem>
                    <SelectItem value="vendor">Vendor Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-ink"
                  htmlFor="template-desc"
                >
                  Description
                </label>
                <Textarea
                  id="template-desc"
                  placeholder="Brief description of this template..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                className="border-hairline bg-transparent text-ink hover:bg-soft-stone"
                onClick={() => setDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        <BlogFilterChip
          onSelect={() => setTypeFilter("all")}
          selected={typeFilter === "all"}
        >
          All
        </BlogFilterChip>
        <BlogFilterChip
          onSelect={() => setTypeFilter("event")}
          selected={typeFilter === "event"}
        >
          Event Templates
        </BlogFilterChip>
        <BlogFilterChip
          onSelect={() => setTypeFilter("vendor")}
          selected={typeFilter === "vendor"}
        >
          Vendor Templates
        </BlogFilterChip>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[22px] bg-soft-stone px-6 py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-ink/30" />
          <p className="ds-feature-heading text-ink">No templates found</p>
          <p className="ds-body mt-2 text-ink/60">
            {search || typeFilter !== "all"
              ? "Try adjusting your filters or search."
              : "Create your first contract template to standardize your agreements."}
          </p>
        </div>
      ) : (
        <>
          <MonoLabel className="text-ink/50">
            {filtered.length} template{filtered.length !== 1 ? "s" : ""}
          </MonoLabel>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template) => {
              const config = TYPE_CONFIG[template.type];
              const Icon = config.icon;
              return (
                <div
                  className="group rounded-[var(--radius-xl)] border border-hairline bg-canvas p-5 transition-shadow hover:shadow-md"
                  key={template.id}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-ink/60" />
                      <h3 className="ds-body-large font-medium text-ink">
                        {template.name}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
                    >
                      {config.label}
                    </span>
                  </div>

                  {template.description && (
                    <p className="ds-caption mb-4 line-clamp-2 text-ink/60">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t border-hairline pt-3">
                    <span className="ds-mono text-xs text-ink/50">
                      Used {template.usageCount} time
                      {template.usageCount !== 1 ? "s" : ""}
                    </span>
                    <span className="ds-mono text-xs text-ink/50">
                      {formatDate(template.lastModified)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
