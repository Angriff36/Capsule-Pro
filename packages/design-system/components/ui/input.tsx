import { cn } from "@repo/design-system/lib/utils";
import type * as React from "react";

/**
 * Input per DESIGN.md: rectangular field, thin hairline border, no shadow.
 * Focus uses the form-focus violet/blue ring rather than a heavy box-shadow.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input h-10 w-full min-w-0 rounded-sm border bg-canvas px-3 py-2 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
