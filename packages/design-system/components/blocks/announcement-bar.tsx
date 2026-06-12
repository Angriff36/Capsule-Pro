import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * AnnouncementBar — Cohere-aligned global announcement strip.
 *
 * Per DESIGN.md `announcement-bar`: full-width 36px black bar pinned above
 * the navigation. Uses micro typography (12px) with on-dark colour and
 * supports a single inline call-to-action via `linkComponent` injection so
 * the design-system package does not depend on `next/link`.
 *
 * Hosts that want to dismiss the bar should control mounting from outside;
 * this primitive is intentionally render-only.
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

export interface AnnouncementBarProps {
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
  linkComponent?: LinkComponent;
  message: ReactNode;
}

export function AnnouncementBar({
  message,
  ctaLabel,
  ctaHref,
  linkComponent,
  className,
}: AnnouncementBarProps) {
  const Link = linkComponent ?? DefaultLink;

  return (
    <section
      aria-label="Site announcement"
      className={cn(
        "ds-micro flex h-9 w-full items-center justify-center gap-3 bg-[#000000] px-4 text-canvas",
        className
      )}
      data-slot="announcement-bar"
    >
      <span className="truncate">{message}</span>
      {ctaLabel && ctaHref ? (
        <Link
          className="font-medium text-canvas underline-offset-4 hover:underline"
          href={ctaHref}
        >
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
