import { listInventoryItems, listInventoryStocks, listInventoryTransactions, listStorageLocations } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const statusVariant: Record<string, "secondary" | "destructive" | "outline"> = {
  Healthy: "secondary",
  "Reorder soon": "outline",
  Critical: "destructive",
};

const computeStatus = (
  quantityOnHand: number,
  reorderLevel: number
): string => {
  if (quantityOnHand <= 0 || quantityOnHand <= reorderLevel * 0.5) {
    return "Critical";
  }
  if (quantityOnHand <= reorderLevel) {
    return "Reorder soon";
  }
  return "Healthy";
};

const WarehouseInventoryPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  await getTenantIdForOrg(orgId);

  // Fetch active inventory items ordered by name
  const items = (await listInventoryItems()).data;

  // Compute daily usage from transactions in the last 7 days.
  // Uses raw SQL to aggregate transaction quantities grouped by item.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const usageByItem = new Map<string, number>();
  const transactions = (await listInventoryTransactions()).data;
  for (const transaction of transactions) {
    if (!transaction.transactionDate) {
      continue;
    }
    if (new Date(transaction.transactionDate) < sevenDaysAgo) {
      continue;
    }
    const quantity = Math.abs(Number(transaction.quantity ?? 0));
    usageByItem.set(
      transaction.itemId,
      (usageByItem.get(transaction.itemId) ?? 0) + quantity / 7
    );
  }

  const stocks = (await listInventoryStocks()).data;
  const storageLocations = (await listStorageLocations()).data;
  const locationNameById = new Map(
    storageLocations.map((location) => [location.id, location.name])
  );
  const primaryStockByItem = new Map<
    string,
    { storageLocationId: string; quantityOnHand: number }
  >();
  for (const stock of stocks) {
    const quantityOnHand = Number(stock.quantity_on_hand ?? 0);
    const existing = primaryStockByItem.get(stock.itemId);
    if (!existing || quantityOnHand > existing.quantityOnHand) {
      primaryStockByItem.set(stock.itemId, {
        storageLocationId: stock.storageLocationId,
        quantityOnHand,
      });
    }
  }
  const locationByItem = new Map<string, string>();
  for (const [itemId, stock] of primaryStockByItem.entries()) {
    locationByItem.set(
      itemId,
      locationNameById.get(stock.storageLocationId) ?? "Unassigned"
    );
  }

  // Build display rows
  const inventoryRows = items.map((item) => {
    const qoh = Number(item.quantityOnHand);
    const reorder = Number(item.reorder_level);
    const dailyUsage = usageByItem.get(item.id) ?? 0;
    const location = locationByItem.get(item.id) ?? "Unassigned";
    const status = computeStatus(qoh, reorder);

    return {
      id: item.id,
      name: item.name,
      location,
      stock: qoh,
      dailyUsage: Math.round(dailyUsage * 10) / 10,
      status,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="font-semibold text-2xl tracking-tight">
          Warehouse Inventory
        </h1>
        <p className="text-muted-foreground">
          Monitor on-hand and consumption trends for fast-moving goods.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Stock by Location
        </h2>
        <Card tone="canvas">
          <CardContent className="overflow-x-auto">
            <div className="rounded-md border">
              {inventoryRows.length === 0 ? (
                <div className="p-6 text-muted-foreground text-sm">
                  No inventory items found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Daily usage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryRows.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell className="text-right">
                          {item.stock}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.dailyUsage}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariant[item.status] ?? "outline"}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default WarehouseInventoryPage;
