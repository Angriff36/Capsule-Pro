import { cn } from "@repo/design-system/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

/**
 * BlogFilterChip — Cohere-aligned editorial taxonomy chip used in blog
 * and research filter rails. Per DESIGN.md `blog-filter-chip`:
 * transparent background, coral text, card-heading typography, 8px
 * (`rounded-sm`) radius, 8/14px padding.
 *
 * The two `tone` variants follow the documented behaviour:
 *   - coral (default) — outlined editorial taxonomy chip
 *   - active          — filled near-black state for the selected filter
 *
 * Renders as a button when `onSelect` is provided so the chip is
 * focusable; otherwise renders as a static span (e.g. inside a research
 * row's metadata column).
 */
const blogFilterChipVariants = cva(
  "ds-feature-heading inline-flex items-center gap-1.5 rounded-sm border px-3.5 py-2 transition-colors",
  {
    variants: {
      tone: {
        coral:
          "border-[color:var(--ds-coral-soft)] bg-transparent text-coral hover:border-coral",
        active: "border-[#17171c] bg-[#17171c] text-canvas",
        ghost: "border-hairline bg-transparent text-ink hover:border-ink",
      },
    },
    defaultVariants: {
      tone: "coral",
    },
  }
);

export interface BlogFilterChipProps
  extends VariantProps<typeof blogFilterChipVariants> {
  children: ReactNode;
  onSelect?: () => void;
  selected?: boolean;
  className?: string;
}

export function BlogFilterChip({
  children,
  onSelect,
  selected,
  tone,
  className,
}: BlogFilterChipProps) {
  const resolvedTone = selected ? "active" : (tone ?? "coral");

  if (onSelect) {
    return (
      <button
        aria-pressed={selected ?? false}
        className={cn(
          blogFilterChipVariants({ tone: resolvedTone }),
          className
        )}
        data-slot="blog-filter-chip"
        onClick={onSelect}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={cn(blogFilterChipVariants({ tone: resolvedTone }), className)}
      data-slot="blog-filter-chip"
    >
      {children}
    </span>
  );
}

export { blogFilterChipVariants };
