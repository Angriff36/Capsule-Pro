import { cn } from "@repo/design-system/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import type * as React from "react";

/**
 * Button variants per DESIGN.md (Cohere):
 *  - default      → near-black pill primary CTA
 *  - secondary    → soft-stone neutral surface
 *  - outline      → 1px hairline outlined pill (research-filter style)
 *  - ghost        → text-only with subtle hover
 *  - link         → underlined editorial link
 *  - destructive  → error state
 *  - on-dark      → white pill for dark feature bands
 *  - coral        → editorial taxonomy chip (use sparingly)
 *
 * Sizes default to pill radius. Use size="square" for icon buttons that should keep rounded-md.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40",
        outline:
          "border border-hairline bg-transparent text-foreground hover:bg-soft-stone",
        secondary:
          "bg-soft-stone text-ink hover:bg-soft-stone/80",
        ghost:
          "bg-transparent text-foreground hover:bg-soft-stone",
        link:
          "rounded-none text-foreground underline underline-offset-4 hover:text-action-blue",
        "on-dark":
          "bg-canvas text-ink hover:bg-canvas/90",
        coral:
          "border border-coral-soft bg-transparent text-coral hover:bg-coral/10",
      },
      size: {
        default: "h-9 px-5 has-[>svg]:px-4",
        sm: "h-8 px-4 gap-1.5 text-[13px] has-[>svg]:px-3",
        lg: "h-11 px-7 text-[15px] has-[>svg]:px-5",
        icon: "size-9 rounded-full",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
        square: "h-9 px-4 rounded-md has-[>svg]:px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? SlotPrimitive.Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
