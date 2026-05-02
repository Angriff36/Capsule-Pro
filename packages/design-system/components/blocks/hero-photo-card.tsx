import { cn } from "@repo/design-system/lib/utils";
import type { ReactNode } from "react";

/**
 * HeroPhotoCard — Cohere-aligned signature media card used on home and
 * product hero compositions. Per DESIGN.md `hero-photo-card`: canvas
 * background, 22px (`rounded-media`) radius, no shadow.
 *
 * Renders a presentational card whose dominant visual is supplied as
 * `media` (typically an `<img>`, `<video>`, or React component). An
 * optional `caption` slot sits beneath the media in body-large type and an
 * `overlay` slot lets callers nest a darker `AgentConsoleCard` for the
 * two-card hero composition described in DESIGN.md §Layout.
 *
 * The component does not own image optimisation; host apps that need
 * `next/image` should pass an already-optimised element via `media`.
 */
export interface HeroPhotoCardProps {
  media: ReactNode;
  caption?: ReactNode;
  overlay?: ReactNode;
  className?: string;
}

export function HeroPhotoCard({
  media,
  caption,
  overlay,
  className,
}: HeroPhotoCardProps) {
  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-media border border-card-border bg-canvas",
        className
      )}
      data-slot="hero-photo-card"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-media">
        {media}
        {overlay ? (
          <div
            className="absolute inset-x-6 bottom-6 max-w-md"
            data-slot="hero-photo-card-overlay"
          >
            {overlay}
          </div>
        ) : null}
      </div>
      {caption ? (
        <figcaption className="ds-body-large px-6 pt-6 pb-8 text-ink">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
