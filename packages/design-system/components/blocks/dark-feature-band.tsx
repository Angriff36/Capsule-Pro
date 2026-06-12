import { cn } from "@repo/design-system/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

/**
 * DarkFeatureBand — Cohere-aligned full-bleed dark band used for hero CTA
 * sections on product surfaces. Per DESIGN.md `dark-feature-band`:
 * deep-green (`#003c33`) ground, 22px (`rounded-media`) radius, 80px
 * padding, on-dark colour.
 *
 * The `tone` variant lets the same primitive serve the matching
 * `navy-feature-band` callout (financial-services / security pages) by
 * swapping the background to `dark-navy` (`#071829`). Both tones share the
 * same radius, padding, and on-dark text treatment.
 *
 * Use as an inset block on a canvas page; for true full-bleed sections
 * wrap in a parent container that handles outer gutters.
 */
const darkFeatureBandVariants = cva(
  "flex flex-col gap-6 rounded-media px-8 py-16 text-canvas md:px-20 md:py-20",
  {
    variants: {
      tone: {
        "deep-green": "bg-deep-green",
        navy: "bg-dark-navy",
      },
      align: {
        start: "items-start text-left",
        center: "items-center text-center",
      },
    },
    defaultVariants: {
      tone: "deep-green",
      align: "start",
    },
  }
);

export interface DarkFeatureBandProps
  extends VariantProps<typeof darkFeatureBandVariants> {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  media?: ReactNode;
  title: ReactNode;
}

export function DarkFeatureBand({
  eyebrow,
  title,
  description,
  actions,
  media,
  children,
  tone,
  align,
  className,
}: DarkFeatureBandProps) {
  return (
    <section
      className={cn(darkFeatureBandVariants({ tone, align }), className)}
      data-slot="dark-feature-band"
      data-tone={tone ?? "deep-green"}
    >
      {eyebrow ? (
        <span className="ds-mono-label text-canvas/70">{eyebrow}</span>
      ) : null}
      <h2 className="ds-section-heading max-w-3xl text-canvas">{title}</h2>
      {description ? (
        <p className="ds-body-large max-w-2xl text-canvas/80">{description}</p>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center gap-3 pt-2">{actions}</div>
      ) : null}
      {media ? <div className="w-full pt-6">{media}</div> : null}
      {children}
    </section>
  );
}

/**
 * NavyFeatureBand — convenience wrapper that pre-selects the navy tone of
 * `DarkFeatureBand`. Provided so consumers can declare intent at the
 * import site (e.g. financial-services pages) without guessing which tone
 * is correct.
 */
export function NavyFeatureBand(props: Omit<DarkFeatureBandProps, "tone">) {
  return <DarkFeatureBand {...props} tone="navy" />;
}

export { darkFeatureBandVariants };
