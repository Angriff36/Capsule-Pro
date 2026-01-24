import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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

    <Card>
      <CardHeader>
        <CardTitle>Stock by location</CardTitle>
      </CardHeader>
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
                  <TableCell className="text-right">{item.dailyUsage}</TableCell>
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
  </div>
);

export default WarehouseInventoryPage;
