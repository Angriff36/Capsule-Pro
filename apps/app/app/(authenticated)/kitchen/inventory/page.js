Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
const tenant_1 = require("../../../lib/tenant");
const header_1 = require("../../components/header");
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const formatQuantity = (qty) => {
  if (qty === 0) return "0";
  if (qty < 0.01) return "<0.01";
  return qty.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
};
const KitchenInventoryPage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return null;
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Fetch inventory items
  const inventoryItems = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT
        id,
        item_number,
        name,
        category,
        quantity_on_hand,
        unit_cost,
        reorder_level,
        tags
      FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY category ASC, name ASC
      LIMIT 100
    `);
  // Fetch low stock alerts
  const lowStockAlerts = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT
        a.id,
        a.item_id,
        a.alert_type,
        a.threshold_value,
        a.triggered_at,
        i.name AS item_name
      FROM tenant_inventory.inventory_alerts a
      JOIN tenant_inventory.inventory_items i
        ON i.tenant_id = a.tenant_id
        AND i.id = a.item_id
      WHERE a.tenant_id = ${tenantId}
        AND a.deleted_at IS NULL
        AND a.resolved_at IS NULL
        AND a.alert_type = 'low_stock'
      ORDER BY a.triggered_at DESC
      LIMIT 20
    `);
  // Calculate summary stats
  const totalValue = inventoryItems.reduce(
    (sum, item) => sum + item.quantity_on_hand * item.unit_cost,
    0
  );
  const lowStockCount = inventoryItems.filter(
    (item) => item.quantity_on_hand <= item.reorder_level
  ).length;
  const outOfStockCount = inventoryItems.filter(
    (item) => item.quantity_on_hand <= 0
  ).length;
  return (
    <>
      <header_1.Header page="Kitchen Inventory" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Total Items
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">{inventoryItems.length}</div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Inventory Value
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                {currencyFormatter.format(totalValue)}
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Low Stock
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {lowStockCount}
              </div>
            </card_1.CardContent>
          </card_1.Card>
          <card_1.Card>
            <card_1.CardHeader className="pb-2">
              <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
                Out of Stock
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold text-red-600">
                {outOfStockCount}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <card_1.Card className="border-amber-200 bg-amber-50">
            <card_1.CardHeader className="pb-3">
              <card_1.CardTitle className="flex items-center gap-2 text-amber-800">
                Low Stock Alerts
                <badge_1.Badge className="bg-amber-600">
                  {lowStockAlerts.length}
                </badge_1.Badge>
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {lowStockAlerts.map((alert) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
                    key={alert.id}
                  >
                    <div>
                      <div className="font-medium">{alert.item_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Below {formatQuantity(alert.threshold_value)}
                      </div>
                    </div>
                    <button_1.Button size="sm" variant="outline">
                      Reorder
                    </button_1.Button>
                  </div>
                ))}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        )}

        {/* Inventory Table */}
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Inventory Items</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            {inventoryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  No inventory items found. Add items to track stock levels.
                </p>
              </div>
            ) : (
              <table_1.Table>
                <table_1.TableHeader>
                  <table_1.TableRow>
                    <table_1.TableHead>Item #</table_1.TableHead>
                    <table_1.TableHead>Name</table_1.TableHead>
                    <table_1.TableHead>Category</table_1.TableHead>
                    <table_1.TableHead className="text-right">
                      On Hand
                    </table_1.TableHead>
                    <table_1.TableHead className="text-right">
                      Reorder Level
                    </table_1.TableHead>
                    <table_1.TableHead className="text-right">
                      Unit Cost
                    </table_1.TableHead>
                    <table_1.TableHead>Status</table_1.TableHead>
                  </table_1.TableRow>
                </table_1.TableHeader>
                <table_1.TableBody>
                  {inventoryItems.map((item) => {
                    const isLow = item.quantity_on_hand <= item.reorder_level;
                    const isOut = item.quantity_on_hand <= 0;
                    return (
                      <table_1.TableRow key={item.id}>
                        <table_1.TableCell className="font-mono text-sm">
                          {item.item_number}
                        </table_1.TableCell>
                        <table_1.TableCell className="font-medium">
                          {item.name}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {item.category && (
                            <badge_1.Badge variant="outline">
                              {item.category}
                            </badge_1.Badge>
                          )}
                        </table_1.TableCell>
                        <table_1.TableCell className="text-right">
                          {formatQuantity(item.quantity_on_hand)}
                        </table_1.TableCell>
                        <table_1.TableCell className="text-right text-muted-foreground">
                          {formatQuantity(item.reorder_level)}
                        </table_1.TableCell>
                        <table_1.TableCell className="text-right">
                          {currencyFormatter.format(item.unit_cost)}
                        </table_1.TableCell>
                        <table_1.TableCell>
                          {isOut ? (
                            <badge_1.Badge variant="destructive">
                              Out of Stock
                            </badge_1.Badge>
                          ) : isLow ? (
                            <badge_1.Badge className="bg-amber-500">
                              Low Stock
                            </badge_1.Badge>
                          ) : (
                            <badge_1.Badge variant="secondary">
                              In Stock
                            </badge_1.Badge>
                          )}
                        </table_1.TableCell>
                      </table_1.TableRow>
                    );
                  })}
                </table_1.TableBody>
              </table_1.Table>
            )}
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </>
  );
};
exports.default = KitchenInventoryPage;
