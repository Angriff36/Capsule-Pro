import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
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

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch active inventory items ordered by name
  const items = await database.inventoryItem.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      quantityOnHand: true,
      reorder_level: true,
      unitOfMeasure: true,
    },
  });

  // Compute daily usage from transactions in the last 7 days.
  // Uses raw SQL to aggregate transaction quantities grouped by item.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const usageRows = await database.$queryRaw<
    { item_id: string; total_qty: Prisma.Decimal }[]
  >`
    SELECT item_id, COALESCE(SUM(ABS(quantity)), 0) AS total_qty
    FROM tenant_inventory.inventory_transactions
    WHERE tenant_id = ${tenantId}::uuid
      AND transaction_date >= ${sevenDaysAgo}
    GROUP BY item_id
  `;

  const usageByItem = new Map<string, number>();
  for (const row of usageRows) {
    usageByItem.set(row.item_id, Number(row.total_qty) / 7);
  }

  // Get primary storage location name for each item via raw SQL join.
  // Picks the stock row with the highest quantity_on_hand per item.
  const locationRows = await database.$queryRaw<
    { item_id: string; location_name: string }[]
  >`
    SELECT DISTINCT ON (s.item_id)
      s.item_id,
      sl.name AS location_name
    FROM tenant_inventory.inventory_stock s
    JOIN tenant_inventory.storage_locations sl
      ON sl.tenant_id = s.tenant_id AND sl.id = s.storage_location_id
    WHERE s.tenant_id = ${tenantId}::uuid
      AND sl.is_active = true
    ORDER BY s.item_id, s.quantity_on_hand DESC
  `;

  const locationByItem = new Map<string, string>();
  for (const row of locationRows) {
    locationByItem.set(row.item_id, row.location_name);
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
        <h1 className="text-3xl font-bold tracking-tight">
          Warehouse Inventory
        </h1>
        <p className="text-muted-foreground">
          Monitor on-hand and consumption trends for fast-moving goods.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Stock by Location
        </h2>
        <Card>
          <CardContent className="overflow-x-auto">
            <div className="rounded-md border">
              {inventoryRows.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
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
