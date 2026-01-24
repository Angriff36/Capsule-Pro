Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
const inventoryItems = [
  {
    name: "Organic Tomatoes",
    location: "Cold dock A",
    stock: 246,
    dailyUsage: 42,
    status: "Healthy",
  },
  {
    name: "Heritage Flour",
    location: "Dry storage",
    stock: 82,
    dailyUsage: 12,
    status: "Reorder soon",
  },
  {
    name: "Duck Confit",
    location: "Freezer 2",
    stock: 16,
    dailyUsage: 5,
    status: "Critical",
  },
];
const statusVariant = {
  Healthy: "secondary",
  "Reorder soon": "outline",
  Critical: "destructive",
};
const WarehouseInventoryPage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Warehouse
      </p>
      <h1 className="text-2xl font-semibold">Inventory</h1>
      <p className="text-sm text-muted-foreground">
        Monitor on-hand and consumption trends for fast-moving goods.
      </p>
    </div>

    <card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Stock by location</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="overflow-x-auto">
        <div className="rounded-md border">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Item</table_1.TableHead>
                <table_1.TableHead>Location</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Stock
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Daily usage
                </table_1.TableHead>
                <table_1.TableHead>Status</table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {inventoryItems.map((item) => (
                <table_1.TableRow key={item.name}>
                  <table_1.TableCell>{item.name}</table_1.TableCell>
                  <table_1.TableCell>{item.location}</table_1.TableCell>
                  <table_1.TableCell className="text-right">
                    {item.stock}
                  </table_1.TableCell>
                  <table_1.TableCell className="text-right">
                    {item.dailyUsage}
                  </table_1.TableCell>
                  <table_1.TableCell>
                    <badge_1.Badge
                      variant={statusVariant[item.status] ?? "outline"}
                    >
                      {item.status}
                    </badge_1.Badge>
                  </table_1.TableCell>
                </table_1.TableRow>
              ))}
            </table_1.TableBody>
          </table_1.Table>
        </div>
      </card_1.CardContent>
    </card_1.Card>
  </div>
);
exports.default = WarehouseInventoryPage;
