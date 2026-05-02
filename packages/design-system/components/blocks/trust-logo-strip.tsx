import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * TrustLogoStrip — Cohere-aligned monochrome partner mark grid that sits
 * far below the hero declaration. Per DESIGN.md `trust-logo-strip`:
 * canvas background, ink text, caption typography (14px / 1.4) and very
 * generous vertical breathing room.
 *
 * Logos are caller-provided so this primitive does not bake in image
 * optimisation or specific brand assets. Each entry can supply its own
 * `node` (custom mark) or fall back to a styled wordmark made from
 * `name`. The optional `eyebrow` mirrors the editorial caption Cohere
 * uses ("Trusted by"), in mono-label type.
 */
export interface TrustLogo {
  name: string;
  node?: ReactNode;
  href?: string;
}

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

export interface TrustLogoStripProps {
  eyebrow?: ReactNode;
  logos: TrustLogo[];
  linkComponent?: LinkComponent;
  className?: string;
}

export function TrustLogoStrip({
  eyebrow,
  logos,
  linkComponent,
  className,
}: TrustLogoStripProps) {
  const Link = linkComponent ?? DefaultLink;

  return (
    <section
      className={cn(
        "flex flex-col items-center gap-10 bg-canvas px-6 py-20 text-ink",
        className
      )}
      data-slot="trust-logo-strip"
    >
      {eyebrow ? (
        <span className="ds-mono-label text-ink/60">{eyebrow}</span>
      ) : null}
      <div className="grid w-full max-w-6xl grid-cols-2 items-center gap-x-12 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {logos.map((logo) => {
          const inner = logo.node ?? (
            <span className="ds-caption font-medium text-ink/70 transition-colors hover:text-ink">
              {logo.name}
            </span>
          );

          return (
            <div className="flex items-center justify-center" key={logo.name}>
              {logo.href ? <Link href={logo.href}>{inner}</Link> : inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
