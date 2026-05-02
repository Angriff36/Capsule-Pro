import { PageCanvas } from "@repo/design-system/components/blocks/page-shell";
import type { ReactNode } from "react";

interface KitchenLayoutProperties {
  readonly children: ReactNode;
}

/** Shared operational shell for all `/kitchen/**` routes (paper tokens under `html.dark`). */
const KitchenLayout = ({ children }: KitchenLayoutProperties) => (
  <PageCanvas className="min-h-0">{children}</PageCanvas>
);

export default KitchenLayout;
