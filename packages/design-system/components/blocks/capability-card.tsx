import { cn } from "@repo/design-system/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * CapabilityCard — Cohere-aligned capability tile used in 3-column feature
 * grids on product pages. Per DESIGN.md `capability-card`: canvas
 * background, ink text, body typography, 4px (`rounded-xs`) radius, 24px
 * padding.
 *
 * Composition is icon → heading → body. An optional `meta` slot renders a
 * tiny mono label at the top (e.g. "01 / Reasoning") to match Cohere's
 * stacked numbered capability layouts. When `href` is supplied the entire
 * card becomes a focusable link via the injected `linkComponent`.
 */
type LinkComponent = (props: {
  href: string;
  className?: string;
  children: ReactNode;
}) => ReactNode;

const DefaultLink: LinkComponent = ({ href, className, children }) => (
  <a className={className} href={href}>
    {children}
  </a>
);

export interface CapabilityCardProps {
  title: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  meta?: ReactNode;
  href?: string;
  linkComponent?: LinkComponent;
  className?: string;
}

export function CapabilityCard({
  title,
  description,
  icon: Icon,
  meta,
  href,
  linkComponent,
  className,
}: CapabilityCardProps) {
  const inner = (
    <>
      {meta ? <span className="ds-mono-label text-ink/60">{meta}</span> : null}
      {Icon ? (
        <span className="flex size-10 items-center justify-center rounded-xs border border-hairline text-ink">
          <Icon className="size-5" />
        </span>
      ) : null}
      <h3 className="ds-feature-heading mt-2 text-ink">{title}</h3>
      <p className="ds-body text-ink/75">{description}</p>
    </>
  );

  if (href) {
    const Link = linkComponent ?? DefaultLink;
    return (
      <Link
        className={cn(
          "flex flex-col gap-3 rounded-xs border border-card-border bg-canvas p-6 text-ink transition-colors hover:border-ink",
          className
        )}
        href={href}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xs border border-card-border bg-canvas p-6 text-ink",
        className
      )}
      data-slot="capability-card"
    >
      {inner}
    </div>
  );
}
