import { cn } from "@repo/design-system/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

/**
 * Card per DESIGN.md (Cohere): white canvas with a 16-22px radius, hairline
 * border, and NO drop shadow. Depth comes from surface alternation, not
 * elevation.
 *
 * `tone` selects the surface treatment so callers don't have to hand-roll
 * Tailwind classes for the three editorial surfaces:
 *   - canvas     → default white card on canvas (most lists / detail panels)
 *   - soft-stone → warm neutral surface (product cards, secondary panels)
 *   - ink        → near-black surface for inset stat-callouts on light pages
 *                  (text inverts to canvas)
 *
 * Use a higher-level wrapper (e.g. a `<DarkBand>` block) for full-bleed dark
 * sections; `tone="ink"` is intended for an inset Card on a light page.
 */
const cardVariants = cva(
  "flex flex-col gap-6 rounded-card border py-6",
  {
    variants: {
      tone: {
        canvas: "bg-card text-card-foreground border-card-border",
        "soft-stone": "bg-soft-stone text-ink border-hairline",
        ink: "bg-ink text-canvas border-ink",
      },
    },
    defaultVariants: {
      tone: "canvas",
    },
  }
);

export type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants>;

function Card({ className, tone, ...props }: CardProps) {
  return (
    <div
      className={cn(cardVariants({ tone, className }))}
      data-slot="card"
      data-tone={tone ?? "canvas"}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      data-slot="card-header"
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("leading-none font-semibold", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      data-slot="card-action"
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("px-6", className)}
      data-slot="card-content"
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      data-slot="card-footer"
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
};
