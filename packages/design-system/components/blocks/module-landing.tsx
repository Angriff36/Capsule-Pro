import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "./page-shell";

/**
 * ModuleLanding — Cohere-aligned landing page composition for any operational
 * module that doesn't need a custom dashboard. Used by `settings`, `tools`,
 * `logistics`, `payroll`, etc.
 *
 * Composition is intentionally simple so consumers can build a top-level page
 * by just declaring `title`, `summary`, and a list of `highlights` (either
 * plain strings for prose blurbs, or rich feature objects with optional icon
 * and href for navigation cards).
 *
 * Renders to:
 *   PageCanvas → CommandBand{Header,Lede} → OperationalColumn → SectionHeader →
 *     responsive grid of soft-stone-bordered canvas cards.
 *
 * Lives in `packages/design-system` so all apps share a single canonical
 * landing primitive (extracted from `apps/app` per IMPLEMENTATION_PLAN §0.11).
 *
 * The `linkComponent` slot lets host apps inject their own router-aware Link
 * (e.g. `next/link`) without forcing the design-system package to depend on
 * `next/*` and break the package boundary rules in AGENTS.md. If omitted, an
 * anchor (`<a>`) is used.
 */
export interface ModuleLandingFeature {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  icon?: LucideIcon;
}

type LinkComponent = (props: {
  href: string;
  className?: string;
  children: ReactNode;
}) => ReactNode;

interface ModuleLandingProperties {
  title: string;
  summary: string;
  highlights: Array<string | ModuleLandingFeature>;
  eyebrow?: string;
  linkComponent?: LinkComponent;
}

const DefaultLink: LinkComponent = ({ href, className, children }) => (
  <a className={className} href={href}>
    {children}
  </a>
);

export const ModuleLanding = ({
  title,
  summary,
  highlights,
  eyebrow,
  linkComponent,
}: ModuleLandingProperties) => {
  const Link = linkComponent ?? DefaultLink;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">
              {eyebrow ?? `Operations / ${title}`}
            </MonoLabel>
            <DisplayHeading>{title}</DisplayHeading>
            <CommandBandLede>{summary}</CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            count={`${highlights.length} workspaces`}
            description="Pick a workspace to get into the work."
            eyebrow="Workspaces"
            title="Where to next"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => {
              if (typeof item === "string") {
                return (
                  <div
                    className="rounded-[22px] border border-hairline bg-canvas p-6"
                    key={item}
                  >
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item}
                    </p>
                  </div>
                );
              }

              const Icon = item.icon;
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    {Icon ? (
                      <div className="flex size-10 items-center justify-center rounded-full border border-hairline bg-soft-stone text-ink">
                        <Icon className="size-5" />
                      </div>
                    ) : (
                      <div />
                    )}
                    {item.href ? (
                      <ArrowUpRight className="size-4 translate-x-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    ) : null}
                  </div>
                  <h3 className="mt-6 font-medium text-ink text-lg leading-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                  {item.href && item.actionLabel ? (
                    <div className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] text-ink uppercase tracking-[0.22em]">
                      {item.actionLabel}
                    </div>
                  ) : null}
                </>
              );

              if (item.href) {
                return (
                  <Link
                    className="group block rounded-[22px] border border-hairline bg-canvas p-6 transition-colors hover:border-ink"
                    href={item.href}
                    key={item.title}
                  >
                    {inner}
                  </Link>
                );
              }

              return (
                <div
                  className="rounded-[22px] border border-hairline bg-canvas p-6"
                  key={item.title}
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};
