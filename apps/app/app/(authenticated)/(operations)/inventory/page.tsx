import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  ChefHat,
  Package,
  ScanBarcode,
  TrendingUp,
  Upload,
} from "lucide-react";
import Link from "next/link";

interface InventoryNavItem {
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
}

const navItems: InventoryNavItem[] = [
  {
    href: "/inventory/items",
    label: "Items",
    description: "Search, create, and manage inventory items across locations.",
    icon: Package,
  },
  {
    href: "/inventory/levels",
    label: "Stock levels",
    description: "Monitor on-hand quantities and low-stock alerts.",
    icon: BarChart3,
  },
  {
    href: "/inventory/transfers",
    label: "Transfers",
    description: "Move stock between locations and events.",
    icon: ArrowLeftRight,
  },
  {
    href: "/inventory/recipe-costs",
    label: "Recipe costs",
    description: "Calculate and manage recipe-level costing.",
    icon: ChefHat,
  },
  {
    href: "/inventory/forecasts",
    label: "Forecasts",
    description: "Usage forecasting and reorder suggestions.",
    icon: TrendingUp,
  },
  {
    href: "/inventory/import",
    label: "Import",
    description: "Bulk-import items from CSV.",
    icon: Upload,
  },
  {
    href: "/inventory/scanner",
    label: "Scanner",
    description: "Scan barcodes to look up or count items in the field.",
    icon: ScanBarcode,
  },
];

const InventoryPage = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Operations / Inventory</MonoLabel>
          <DisplayHeading>Stock, costs, and movement</DisplayHeading>
          <CommandBandLede>
            Manage stock levels, items, recipes, transfers, and forecasting in
            one place. Pick a workspace to get into the work.
          </CommandBandLede>
        </div>
        <CommandBandActions>
          <Button
            asChild
            className="border-white/25 bg-transparent text-white hover:bg-white/10"
            size="sm"
            variant="outline"
          >
            <Link href="/inventory/scanner">Scan barcode</Link>
          </Button>
          <Button asChild size="default" variant="on-dark">
            <Link href="/inventory/items">Open items</Link>
          </Button>
        </CommandBandActions>
      </CommandBandHeader>
    </CommandBand>

    <OperationalColumn>
      <section className="space-y-6">
        <SectionHeader
          count={`${navItems.length} workspaces`}
          description="Each workspace is a focused tool. Pair items + levels for stock, recipes + forecasts for kitchen planning."
          eyebrow="Workspaces"
          title="Open a workspace"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map(({ href, label, description, icon: Icon }) => (
            <Link
              className="group block rounded-[22px] border border-hairline bg-canvas p-6 transition-colors hover:border-ink"
              href={href}
              key={href}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-full border border-hairline bg-soft-stone text-ink">
                  <Icon className="size-5" />
                </div>
                <ArrowUpRight className="size-4 translate-x-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </div>
              <h3 className="mt-6 font-medium text-ink text-lg leading-tight">
                {label}
              </h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </OperationalColumn>
  </PageCanvas>
);

export default InventoryPage;
