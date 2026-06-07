/**
 * Helper functions for shipment item route handlers
 */

import { database, Prisma } from "@repo/database";

/**
 * Updates shipment totals after item modification
 */
export async function updateShipmentTotals(
  tenantId: string,
  shipmentId: string
): Promise<void> {
  const allItems = await database.shipmentItem.findMany({
    where: { tenantId, shipmentId, deletedAt: null },
  });

  const totalItems = allItems.reduce(
    (sum, i) => sum + Number(i.quantityShipped),
    0
  );
  const totalValue = allItems.reduce((sum, i) => sum + Number(i.totalCost), 0);

  await database.shipment.updateMany({
    where: {
      tenantId,
      id: shipmentId,
    },
    data: {
      totalItems,
      totalValue: new Prisma.Decimal(totalValue),
    },
  });
}
