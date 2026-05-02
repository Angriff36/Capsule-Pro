import { cn } from "@repo/design-system/lib/utils";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * ProductCard — Cohere-aligned warm product card used to surface
 * marketing tiles for individual products (Command, Embed, Rerank, etc.).
 * Per DESIGN.md `product-card`: soft-stone (`#eeece7`) background, ink
 * text, 8px (`rounded-md`) radius, 32px padding.
 *
 * Composition is mark → heading → body → optional bullet list with the
 * Cohere check glyph → CTA. The bullet list uses the editorial check
 * pattern Cohere applies to "Built for" or "Best for" features. CTA is
 * routed through `linkComponent` so the package stays free of `next/*`.
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

export interface ProductCardProps {
  title: ReactNode;
  description: ReactNode;
  mark?: ReactNode;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  linkComponent?: LinkComponent;
  className?: string;
}

export function ProductCard({
  title,
  description,
  mark,
  bullets,
  ctaLabel,
  ctaHref,
  linkComponent,
  className,
}: ProductCardProps) {
  const Link = linkComponent ?? DefaultLink;

  return (
    <article
      className={cn(
        "flex h-full flex-col gap-5 rounded-md bg-soft-stone p-8 text-ink",
        className
      )}
      data-slot="product-card"
    >
      {mark ? <div className="flex items-center text-ink">{mark}</div> : null}
      <h3 className="ds-card-heading text-ink">{title}</h3>
      <p className="ds-body text-ink/80">{description}</p>
      {bullets?.length ? (
        <ul className="mt-1 flex flex-col gap-2">
          {bullets.map((bullet) => (
            <li
              className="ds-body flex items-start gap-2 text-ink/85"
              key={bullet}
            >
              <Check
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-ink"
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {ctaLabel && ctaHref ? (
        <div className="mt-auto pt-4">
          <Link
            className="ds-button inline-flex items-center gap-2 rounded-pill bg-[#17171c] px-5 py-2 text-canvas transition-colors hover:bg-[#000000]"
            href={ctaHref}
          >
            {ctaLabel}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}
