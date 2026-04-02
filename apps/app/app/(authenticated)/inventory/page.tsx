import Link from "next/link";
import { Package, BarChart3, ArrowLeftRight, ChefHat, TrendingUp, Upload, ScanBarcode } from "lucide-react";

const InventoryPage = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
      <p className="text-muted-foreground">
        Manage stock levels, items, recipes, transfers, and forecasting.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
      <Link href="/inventory/items">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Items</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Search, create, and manage inventory items.
          </p>
        </div>
      </Link>

      <Link href="/inventory/levels">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Stock Levels</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor stock levels and low-stock alerts.
          </p>
        </div>
      </Link>

      <Link href="/inventory/transfers">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Transfers</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Transfer stock between locations and events.
          </p>
        </div>
      </Link>

      <Link href="/inventory/recipe-costs">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <ChefHat className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Recipe Costs</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculate and manage recipe costing.
          </p>
        </div>
      </Link>

      <Link href="/inventory/forecasts">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Forecasts</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Usage forecasting and reorder suggestions.
          </p>
        </div>
      </Link>

      <Link href="/inventory/import">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Import</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Bulk import items from CSV.
          </p>
        </div>
      </Link>

      <Link href="/inventory/scanner">
        <div className="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400">
              <ScanBarcode className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">Scanner</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Scan barcodes to look up or count items.
          </p>
        </div>
      </Link>
    </div>
  </div>
);

export default InventoryPage;
