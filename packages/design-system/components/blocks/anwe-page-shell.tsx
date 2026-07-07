import { cn } from "@repo/design-system/lib/utils";
import type * as React from "react";

/**
 * Anwe page shell — layout primitives from root DESIGN.md (Anwe-derived system).
 * Near-black canvas, gold accents, heavy titles, thin outlined surfaces.
 *
 * Use `.anwe-surface-reset` via AnwePageCanvas so shadcn controls inherit
 * the dark token scope (gold focus ring, card-bg popovers).
 */

const ANWE_SHELL =
  "anwe-surface-reset flex flex-1 flex-col gap-8 bg-anwe-app-bg px-6 py-8 text-anwe-on-surface sm:px-8 lg:max-w-[1440px] lg:gap-10 lg:px-12 lg:py-10";

function AnwePageCanvas({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("relative min-h-full", className)}
      data-slot="anwe-page-canvas"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-anwe-gold/60 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-anwe-gold/10 to-transparent"
      />
      <div className={ANWE_SHELL} {...props} />
    </div>
  );
}

type AnwePageHeaderProps = React.ComponentProps<"header"> & {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

function AnwePageHeader({
  className,
  eyebrow,
  title,
  description,
  actions,
  ...props
}: AnwePageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-6 pb-2",
        className
      )}
      data-slot="anwe-page-header"
      {...props}
    >
      <div className="max-w-2xl space-y-3">
        <p className="font-black text-[11px] text-anwe-tan uppercase tracking-[0.22em]">
          {eyebrow}
        </p>
        <h1 className="font-extrabold text-3xl text-anwe-on-surface leading-tight tracking-[0.02em] sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="text-[15px] text-anwe-on-surface-variant leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

function AnweMetricGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
      data-slot="anwe-metric-grid"
      {...props}
    />
  );
}

type AnweMetricTileProps = React.ComponentProps<"article"> & {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
};

function AnweMetricTile({
  className,
  label,
  value,
  hint,
  ...props
}: AnweMetricTileProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-[20px] border border-white/10 bg-anwe-card-bg p-6",
        className
      )}
      data-slot="anwe-metric-tile"
      {...props}
    >
      <p className="font-black text-[10px] text-anwe-tan uppercase tracking-[0.24em]">
        {label}
      </p>
      <p className="font-extrabold text-3xl text-anwe-on-surface leading-none tracking-[0.01em]">
        {value}
      </p>
      {hint ? (
        <p className="text-[13px] text-anwe-on-surface-variant">{hint}</p>
      ) : null}
    </article>
  );
}

type AnweSectionLabelProps = React.ComponentProps<"p"> & {
  tone?: "gold" | "tan";
};

function AnweSectionLabel({
  className,
  tone = "tan",
  ...props
}: AnweSectionLabelProps) {
  return (
    <p
      className={cn(
        "font-black text-[11px] uppercase tracking-[0.2em]",
        tone === "gold" ? "text-anwe-gold" : "text-anwe-tan",
        className
      )}
      data-slot="anwe-section-label"
      {...props}
    />
  );
}

function AnwePanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-white/10 bg-anwe-card-bg",
        className
      )}
      data-slot="anwe-panel"
      {...props}
    />
  );
}

function AnwePanelRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-white/10 border-b px-5 py-4 last:border-b-0",
        className
      )}
      data-slot="anwe-panel-row"
      {...props}
    />
  );
}

function AnweFilterPill({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-anwe-gold/40 bg-anwe-surface-lowest px-3 py-1 font-bold text-[12px] text-anwe-on-surface tracking-wide",
        className
      )}
      data-slot="anwe-filter-pill"
      {...props}
    />
  );
}

function AnweSecondaryButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-anwe-gray-50 px-4 py-2.5 font-medium text-[14px] text-anwe-on-surface transition-colors hover:border-white/20 hover:bg-anwe-gray-100 focus-visible:outline-2 focus-visible:outline-anwe-gold focus-visible:outline-offset-2 disabled:opacity-40",
        className
      )}
      type="button"
      {...props}
    />
  );
}

export {
  AnweFilterPill,
  AnweMetricGrid,
  AnweMetricTile,
  AnwePageCanvas,
  AnwePageHeader,
  AnwePanel,
  AnwePanelRow,
  AnweSecondaryButton,
  AnweSectionLabel,
};
