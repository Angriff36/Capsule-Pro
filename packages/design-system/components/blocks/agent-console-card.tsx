import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * AgentConsoleCard — Cohere-aligned dark product mockup card used to
 * showcase agent / command-board UI snippets. Per DESIGN.md
 * `agent-console-card`: near-black primary surface (`#17171c`), 8px
 * (`rounded-md`) radius, 24px padding, on-dark colour.
 *
 * Renders a chrome (status row + optional title) and a body slot. Callers
 * supply integration badges or status pills directly into `statusItems`.
 * Status items can be plain strings or rich nodes; strings render as the
 * monochrome status pill described in DESIGN.md §Components / Buttons.
 */
export interface AgentConsoleCardProps {
  title?: ReactNode;
  eyebrow?: ReactNode;
  statusItems?: ReactNode[];
  children: ReactNode;
  className?: string;
}

export function AgentConsoleCard({
  title,
  eyebrow,
  statusItems,
  children,
  className,
}: AgentConsoleCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-md bg-[#17171c] p-6 text-canvas",
        className
      )}
      data-slot="agent-console-card"
    >
      {eyebrow || statusItems?.length ? (
        <div className="flex items-center justify-between gap-3">
          {eyebrow ? (
            <span className="ds-mono-label text-canvas/60">{eyebrow}</span>
          ) : (
            <span />
          )}
          {statusItems?.length ? (
            <div className="flex items-center gap-2">
              {statusItems.map((item, index) =>
                typeof item === "string" ? (
                  <span
                    className="ds-micro inline-flex items-center rounded-pill border border-canvas/15 px-2 py-0.5 text-canvas/80"
                    // biome-ignore lint/suspicious/noArrayIndexKey: status pills are stable per render
                    key={`${item}-${index}`}
                  >
                    {item}
                  </span>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: caller-controlled rich nodes
                  <span key={index}>{item}</span>
                )
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {title ? (
        <h3 className="ds-feature-heading text-canvas">{title}</h3>
      ) : null}
      <div className="ds-body text-canvas/85">{children}</div>
    </div>
  );
}
