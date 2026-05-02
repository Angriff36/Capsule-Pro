import { cn } from "@repo/design-system/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";

/**
 * Badge per DESIGN.md: restrained status chip used as SECONDARY metadata.
 * Never louder than primary content. Visual weight ranks below page titles,
 * row primaries (recipe/event/guest names), and operational numbers.
 *
 * Variants:
 *  - default      → soft-stone fill, ink text (neutral metadata)
 *  - outline      → 1px hairline outlined pill (default for status)
 *  - solid        → near-black pill (use sparingly for high emphasis)
 *  - success      → pale-green tint with deep-green text
 *  - warning      → amber tint
 *  - destructive  → red tint
 *  - info         → pale-blue with action-blue text
 *  - coral        → editorial taxonomy chip (blog/categories)
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-soft-stone text-ink [a&]:hover:bg-soft-stone/80",
        outline:
          "border-hairline bg-transparent text-foreground [a&]:hover:bg-soft-stone",
        secondary:
          "border-transparent bg-soft-stone text-ink [a&]:hover:bg-soft-stone/80",
        solid:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        destructive:
          "border-transparent bg-destructive/10 text-destructive [a&]:hover:bg-destructive/20",
        success:
          "border-transparent bg-pale-green text-deep-green [a&]:hover:bg-pale-green/80",
        warning:
          "border-transparent bg-[#fff5e0] text-[#7a521a]",
        info:
          "border-transparent bg-pale-blue text-action-blue",
        coral:
          "border-coral-soft bg-transparent text-coral",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : "span";

  return (
    <Comp
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
