import { cn } from "@repo/design-system/lib/utils";
import type * as React from "react";

/**
 * page-shell — shared editorial layout primitives extracted from the
 * kitchen-dashboard pattern (the visual benchmark per DESIGN.md).
 *
 * These are pure presentational wrappers. They impose hierarchy and
 * spacing; they do not own data, state, or behavior.
 *
 * Composition recipe (typical operational dashboard):
 *
 *   <PageCanvas>
 *     <PageLead eyebrow title description />   // light pages — no CommandBand
 *     <CommandBand>                            // or deep-green hero when needed
 *       <MonoLabel tone="dark" />
 *       <DisplayHeading />        // h1
 *       <CommandBandBody>...</CommandBandBody>
 *       <MetricBand>
 *         <MetricCell />
 *       </MetricBand>
 *     </CommandBand>
 *
 *     <PageBody>
 *       <FilterRail>...</FilterRail>
 *       <OperationalColumn>
 *         <SectionHeader />
 *         <OperationalRow />
 *       </OperationalColumn>
 *     </PageBody>
 *   </PageCanvas>
 */

/** Light paper shell; semantic colors re-scoped via .editorial-surface-reset (dark-mode safe). */
const OPERATIONAL_SHELL_CLASS =
  "editorial-surface-reset flex flex-1 flex-col gap-12 bg-background px-4 pt-2 pb-28 text-foreground sm:px-6 lg:px-10";

/* -------------------------------------------------------------------------- */
/*  Outer canvas                                                              */
/* -------------------------------------------------------------------------- */

function PageCanvas({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(OPERATIONAL_SHELL_CLASS, className)}
      data-slot="page-canvas"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Mono eyebrow label                                                        */
/* -------------------------------------------------------------------------- */

type MonoLabelProps = React.ComponentProps<"span"> & {
  tone?: "dark" | "light" | "muted";
};

function MonoLabel({ className, tone = "muted", ...props }: MonoLabelProps) {
  return (
    <span
      className={cn(
        "font-mono uppercase tracking-[0.28em]",
        tone === "dark" && "text-[12px] text-white/60",
        tone === "muted" && "text-[11px] text-muted-foreground",
        tone === "light" && "text-[11px] text-white",
        className
      )}
      data-slot="mono-label"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Display heading (editorial h1/h2)                                         */
/* -------------------------------------------------------------------------- */

type DisplayHeadingProps = React.ComponentProps<"h1"> & {
  as?: "h1" | "h2";
  size?: "lg" | "md";
};

function DisplayHeading({
  className,
  as: Tag = "h1",
  size = "lg",
  ...props
}: DisplayHeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display font-normal leading-[1.05] tracking-[-0.02em]",
        size === "lg" && "text-4xl sm:text-5xl",
        size === "md" && "text-3xl sm:text-4xl",
        className
      )}
      data-slot="display-heading"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Command band — deep-green editorial hero                                  */
/* -------------------------------------------------------------------------- */

type CommandBandProps = React.ComponentProps<"section"> & {
  tone?: "deep-green" | "navy" | "ink";
};

function CommandBand({
  className,
  tone = "deep-green",
  ...props
}: CommandBandProps) {
  return (
    <section
      className={cn(
        "relative flex flex-col gap-10 overflow-hidden rounded-[22px] border px-6 py-10 text-white sm:px-10 sm:py-14",
        tone === "deep-green" && "border-deep-green bg-deep-green",
        tone === "navy" && "border-dark-navy bg-dark-navy",
        tone === "ink" && "border-ink bg-ink",
        className
      )}
      data-slot="command-band"
      {...props}
    />
  );
}

function CommandBandHeader({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-6 lg:gap-8",
        className
      )}
      data-slot="command-band-header"
      {...props}
    />
  );
}

function CommandBandBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("space-y-8", className)}
      data-slot="command-band-body"
      {...props}
    />
  );
}

function CommandBandActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-slot="command-band-actions"
      {...props}
    />
  );
}

function CommandBandLede({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("max-w-2xl text-base text-white/70", className)}
      data-slot="command-band-lede"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Metric band — stats grid that sits inside a CommandBand                   */
/* -------------------------------------------------------------------------- */

type MetricBandProps = React.ComponentProps<"div"> & {
  cols?: 2 | 3 | 4;
  /** When true, render with a light surface (for placement outside dark band) */
  surface?: "dark" | "light";
};

function MetricBand({
  className,
  cols = 4,
  surface = "dark",
  ...props
}: MetricBandProps) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-[16px] border",
        surface === "dark"
          ? "border-white/15 bg-white/15"
          : "border-card-border bg-card-border",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 xl:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
      data-slot="metric-band"
      {...props}
    />
  );
}

type MetricCellProps = React.ComponentProps<"div"> & {
  surface?: "dark" | "light";
};

function MetricCell({
  className,
  surface = "dark",
  ...props
}: MetricCellProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-6",
        surface === "dark" ? "bg-deep-green text-white" : "bg-canvas text-ink",
        className
      )}
      data-slot="metric-cell"
      {...props}
    />
  );
}

function MetricLabel({
  className,
  surface = "dark",
  ...props
}: React.ComponentProps<"div"> & { surface?: "dark" | "light" }) {
  return (
    <div
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.28em]",
        surface === "dark" ? "text-white/55" : "text-muted-foreground",
        className
      )}
      data-slot="metric-label"
      {...props}
    />
  );
}

function MetricValue({
  className,
  surface = "dark",
  ...props
}: React.ComponentProps<"div"> & { surface?: "dark" | "light" }) {
  return (
    <div
      className={cn(
        "font-normal text-5xl leading-none tracking-[-0.02em]",
        surface === "dark" ? "text-white" : "text-ink",
        className
      )}
      data-slot="metric-value"
      {...props}
    />
  );
}

function MetricDelta({
  className,
  surface = "dark",
  ...props
}: React.ComponentProps<"div"> & { surface?: "dark" | "light" }) {
  return (
    <div
      className={cn(
        "text-[12px] leading-relaxed",
        surface === "dark" ? "text-white/55" : "text-muted-foreground",
        className
      )}
      data-slot="metric-delta"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Page body — two-column layout (rail + main column)                         */
/* -------------------------------------------------------------------------- */

type PageBodyProps = React.ComponentProps<"div"> & {
  variant?: "rail" | "single";
};

function PageBody({ className, variant = "single", ...props }: PageBodyProps) {
  return (
    <div
      className={cn(
        "grid gap-10",
        variant === "rail" && "lg:grid-cols-[300px_1fr]",
        className
      )}
      data-slot="page-body"
      {...props}
    />
  );
}

/* Soft-stone sticky sidebar used for filters / context */
function FilterRail({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "h-fit space-y-5 rounded-[16px] border border-hairline bg-soft-stone p-6 lg:sticky lg:top-6",
        className
      )}
      data-slot="filter-rail"
      {...props}
    />
  );
}

function FilterRailGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("space-y-2.5", className)}
      data-slot="filter-rail-group"
      {...props}
    />
  );
}

function FilterRailLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]",
        className
      )}
      data-slot="filter-rail-label"
      {...props}
    />
  );
}

function OperationalColumn({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("space-y-10", className)}
      data-slot="operational-column"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Page lead — light editorial page header (no CommandBand)                     */
/* -------------------------------------------------------------------------- */

type PageLeadProps = Omit<React.ComponentProps<"header">, "title"> & {
  /** Mono eyebrow, e.g. "Analytics / Activity" */
  eyebrow: React.ReactNode;
  /** Primary page title (not the HTML `title` tooltip attribute) */
  title: React.ReactNode;
  /** Supporting copy under the title */
  description?: React.ReactNode;
  /** Optional trailing actions (buttons, links) */
  actions?: React.ReactNode;
  /** DisplayHeading size — defaults to md for inner pages */
  headingSize?: "lg" | "md";
};

/**
 * Top-of-page header for operational views that skip the deep-green CommandBand.
 * Pair with PageCanvas → PageBody → OperationalColumn.
 */
function PageLead({
  className,
  eyebrow,
  title,
  description,
  actions,
  headingSize = "md",
  ...props
}: PageLeadProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-6 border-hairline border-b pb-8",
        className
      )}
      data-slot="page-lead"
      {...props}
    >
      <div className="space-y-3">
        <MonoLabel>{eyebrow}</MonoLabel>
        <DisplayHeading size={headingSize}>{title}</DisplayHeading>
        {description ? (
          <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
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

/* -------------------------------------------------------------------------- */
/*  Section header — eyebrow + title + count + actions                         */
/* -------------------------------------------------------------------------- */

type SectionHeaderProps = Omit<React.ComponentProps<"header">, "title"> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  count?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
};

function SectionHeader({
  className,
  eyebrow,
  title,
  description,
  count,
  actions,
  icon,
  ...props
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-hairline border-b pb-4",
        className
      )}
      data-slot="section-header"
      {...props}
    >
      <div>
        {eyebrow ? (
          <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
            {eyebrow}
          </div>
        ) : null}
        <h3
          className={cn(
            "flex items-center gap-2 font-normal text-3xl text-ink leading-tight tracking-[-0.01em]",
            eyebrow ? "mt-1" : null
          )}
        >
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
          {title}
        </h3>
        {description ? (
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {count !== undefined && count !== null ? (
          <span className="rounded-full border border-hairline bg-canvas px-3 py-1 font-mono text-[11px] text-ink uppercase tracking-[0.18em]">
            {count}
          </span>
        ) : null}
        {actions}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Operational row — hairline-bordered list item on canvas                    */
/* -------------------------------------------------------------------------- */

type OperationalRowProps = React.ComponentProps<"article"> & {
  interactive?: boolean;
  density?: "comfortable" | "compact";
};

function OperationalRow({
  className,
  interactive = false,
  density = "comfortable",
  ...props
}: OperationalRowProps) {
  return (
    <article
      className={cn(
        "rounded-[22px] border border-hairline bg-canvas transition-colors",
        density === "comfortable" ? "p-6" : "p-4",
        interactive && "hover:border-ink",
        className
      )}
      data-slot="operational-row"
      {...props}
    />
  );
}

/* Compact version: single-line dense rows used inside lists/tables */
function OperationalLine({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 border-hairline border-b px-2 py-4 last:border-b-0",
        interactive && "transition-colors hover:bg-soft-stone/40",
        className
      )}
      data-slot="operational-line"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Status pill — small mono chip, restrained                                  */
/* -------------------------------------------------------------------------- */

function StatusPill({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-hairline bg-canvas px-2.5 py-0.5 font-mono text-[11px] text-ink uppercase tracking-[0.18em]",
        className
      )}
      data-slot="status-pill"
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Kitchen Dashboard parity — events › kitchen-dashboard layout chrome        */
/* -------------------------------------------------------------------------- */

/** Editorial canvas alias — identical shell to PageCanvas */
function KitchenOperationalCanvas({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(OPERATIONAL_SHELL_CLASS, className)}
      data-slot="kitchen-operational-canvas"
      {...props}
    />
  );
}

interface KitchenOperationalHeroProps {
  actions?: React.ReactNode;
  /** Optional row beneath the headline (e.g. quick-filter toggles) */
  ancillaryRow?: React.ReactNode;
  eyebrow: string;
  lede: React.ReactNode;
  /** Typically `<KitchenOperationalMetricTiles>...</KitchenOperationalMetricTiles>` */
  metrics: React.ReactNode;
  title: React.ReactNode;
}

/** Forest-green hero strip — parity with events › kitchen-dashboard */
function KitchenOperationalHero({
  eyebrow,
  title,
  lede,
  actions,
  ancillaryRow,
  metrics,
}: KitchenOperationalHeroProps) {
  return (
    <section
      className="overflow-hidden rounded-[22px] border border-[#003c33] bg-[#003c33] text-white"
      data-slot="kitchen-operational-hero"
    >
      <div className="space-y-10 px-6 py-10 sm:px-10 sm:py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="font-mono text-[12px] text-white/60 uppercase tracking-[0.28em]">
              {eyebrow}
            </p>
            <h2 className="font-display font-normal text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              {title}
            </h2>
            <p className="max-w-xl text-base text-white/70 leading-relaxed">
              {lede}
            </p>
          </div>
          {actions === undefined ? null : (
            <div className="flex flex-wrap items-center gap-3">{actions}</div>
          )}
        </div>
        {ancillaryRow === undefined ? null : ancillaryRow}
        {metrics}
      </div>
    </section>
  );
}

function KitchenOperationalMetricTiles({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid gap-px overflow-hidden rounded-[16px] border border-white/15 bg-white/15 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
      data-slot="kitchen-operational-metric-tiles"
    >
      {children}
    </section>
  );
}

type KitchenOperationalMetricAccent = "default" | "coral";

function KitchenOperationalMetricTile({
  label,
  value,
  caption,
  accent = "default",
}: {
  label: string;
  value: React.ReactNode;
  caption: string;
  accent?: KitchenOperationalMetricAccent;
}) {
  return (
    <div className="flex flex-col gap-4 bg-[#003c33] p-6">
      <p
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.28em]",
          accent === "coral" ? "text-[#ffad9b]" : "text-white/55"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-normal text-5xl leading-none tracking-[-0.02em]",
          accent === "coral" ? "text-[#ff7759]" : "text-white"
        )}
      >
        {value}
      </p>
      <p className="text-[12px] text-white/55">{caption}</p>
    </div>
  );
}

function KitchenDashboardFilterAside({
  className,
  children,
  ...props
}: React.ComponentProps<"aside">) {
  return (
    <aside className={cn("w-full min-w-0", className)} {...props}>
      <div className="sticky top-6 rounded-[16px] border border-hairline bg-soft-stone p-6">
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
          Filters
        </p>
        <h3 className="mt-2 font-normal text-2xl text-ink leading-tight tracking-[-0.01em]">
          Refine the view.
        </h3>
        <div className="mt-6 border-hairline border-t pt-6">{children}</div>
      </div>
    </aside>
  );
}

interface KitchenOperationalSectionLeadProps {
  countBadge?: React.ReactNode;
  eyebrow: string;
  subtitle?: React.ReactNode;
  title: string;
}

/** Section title row matching kitchen-dashboard "Live operations / In window now" rhythm */
function KitchenOperationalSectionLead({
  className,
  eyebrow,
  title,
  subtitle,
  countBadge,
}: KitchenOperationalSectionLeadProps &
  Pick<React.ComponentProps<"div">, "className">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 border-hairline border-b pb-4",
        className
      )}
      data-slot="kitchen-section-lead"
    >
      <div>
        <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
          {eyebrow}
        </p>
        <h3 className="mt-1 font-normal text-3xl text-ink leading-tight tracking-[-0.01em]">
          {title}
        </h3>
        {subtitle === undefined ? null : (
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {countBadge === undefined ? null : (
        <span className="rounded-full border border-hairline bg-canvas px-3 py-1 font-mono text-[11px] text-ink uppercase tracking-[0.18em]">
          {countBadge}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  FilterRail,
  FilterRailGroup,
  FilterRailLabel,
  KitchenDashboardFilterAside,
  KitchenOperationalCanvas,
  KitchenOperationalHero,
  KitchenOperationalMetricTile,
  KitchenOperationalMetricTiles,
  KitchenOperationalSectionLead,
  MetricBand,
  MetricCell,
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  OperationalLine,
  OperationalRow,
  PageBody,
  PageCanvas,
  PageLead,
  SectionHeader,
  StatusPill,
};
