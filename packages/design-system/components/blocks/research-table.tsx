import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * ResearchTable — Cohere-aligned editorial list used on research and
 * publications surfaces. Per DESIGN.md `research-table`: canvas
 * background, ink text, body-large typography. Rows separated by
 * hairline rules instead of card chrome.
 *
 * Each row is laid out as title (left, body-large) → optional taxonomy
 * pills (center) → date / metadata (right, monospace caption). Title
 * becomes a link when `href` is supplied. The table itself has no
 * outer border; consumers wrap it in their own `OperationalColumn` or
 * page block to control gutters.
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

export interface ResearchTableRow {
  href?: string;
  id: string;
  meta?: ReactNode;
  pills?: ReactNode;
  title: ReactNode;
}

export interface ResearchTableProps {
  caption?: ReactNode;
  className?: string;
  linkComponent?: LinkComponent;
  rows: ResearchTableRow[];
}

export function ResearchTable({
  rows,
  caption,
  linkComponent,
  className,
}: ResearchTableProps) {
  const Link = linkComponent ?? DefaultLink;

  return (
    <div
      className={cn("flex w-full flex-col bg-canvas text-ink", className)}
      data-slot="research-table"
    >
      {caption ? (
        <div className="ds-mono-label border-hairline border-b pb-3 text-ink/60">
          {caption}
        </div>
      ) : null}
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li
            className="flex flex-col gap-3 border-hairline border-b py-6 md:flex-row md:items-center md:gap-6"
            key={row.id}
          >
            <div className="ds-body-large flex-1 text-ink">
              {row.href ? (
                <Link
                  className="text-ink underline-offset-4 transition-colors hover:underline"
                  href={row.href}
                >
                  {row.title}
                </Link>
              ) : (
                row.title
              )}
            </div>
            {row.pills ? (
              <div className="flex flex-wrap items-center gap-2 md:justify-center">
                {row.pills}
              </div>
            ) : null}
            {row.meta ? (
              <div className="ds-caption shrink-0 text-ink/60 md:text-right">
                {row.meta}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
