import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";

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

const statusVariant: Record<string, "secondary" | "destructive" | "outline"> = {
  Healthy: "secondary",
  "Reorder soon": "outline",
  Critical: "destructive",
};

const WarehouseInventoryPage = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Warehouse Inventory</h1>
      <p className="text-muted-foreground">
        Monitor on-hand and consumption trends for fast-moving goods.
      </p>
    </div>

    <Separator />

    {/* Stock by Location Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Stock by Location
      </h2>
      <Card>
        <CardContent className="overflow-x-auto">
        <div className="rounded-md border">
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
              {inventoryItems.map((item) => (
                <TableRow key={item.name}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell className="text-right">{item.stock}</TableCell>
                  <TableCell className="text-right">
                    {item.dailyUsage}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[item.status] ?? "outline"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </section>
  </div>
);

export default WarehouseInventoryPage;
