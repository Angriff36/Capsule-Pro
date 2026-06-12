/**
 * Helper functions for shipment item route handlers
 */

import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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

  await runManifestCommandCore(
    {
      createRuntime: ({ user, entityName }) =>
        createManifestRuntime({
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
          entityName,
        }),
    },
    {
      entity: "Shipment",
      command: "update",
      instanceId: shipmentId,
      user: { id: "system", tenantId, role: "admin" },
      body: {
        id: shipmentId,
        tenantId,
        // totalItems and totalValue are aggregate fields on Shipment but are
        // NOT declared in the "update" command params. They are passed here
        // so that if the spec is extended later they'll flow through.
        totalItems,
        totalValue,
      },
    }
  );
}
