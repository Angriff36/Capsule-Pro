/**
 * Helper functions for shipment item route handlers
 */

import { database } from "@repo/database";

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

  await database.$executeRaw`
    UPDATE "tenant_inventory"."shipments"
    SET "total_items" = ${totalItems}::integer,
        "total_value" = ${totalValue}::numeric,
        "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${shipmentId}::uuid
  `;
}
