import { cn } from "@repo/design-system/lib/utils";
import type * as React from "react";

/**
 * ResponsiveTable — wraps any `<Table>` with horizontal scroll on narrow viewports.
 *
 * On mobile, tables become horizontally scrollable within a bordered container.
 * On desktop, renders normally.
 *
 * Usage:
 *   <ResponsiveTable>
 *     <Table>
 *       <TableHeader>...</TableHeader>
 *       <TableBody>...</TableBody>
 *     </Table>
 *   </ResponsiveTable>
 */
function ResponsiveTable({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "ds-responsive-table rounded-[16px] border border-hairline",
        className
      )}
      {...props}
    />
  );
}

export { ResponsiveTable };
