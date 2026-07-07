"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  PackageIcon,
  PlusIcon,
  ScanIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { OperationalPageShell } from "../../../components/operational-page-shell";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for barcode lookup and stock adjustment custom endpoints
import { apiFetch } from "@/app/lib/api";
import type { InventoryItemWithStatus } from "@/app/lib/inventory";
import { BarcodeScanner } from "../components/barcode-scanner";

type ScanMode = "lookup" | "stock_count";

interface StockCountItem {
  barcode: string;
  item?: InventoryItemWithStatus;
  quantity: number;
  timestamp: Date;
}

interface ScanHistoryEntry {
  barcode: string;
  found: boolean;
  mode: ScanMode;
  timestamp: Date;
}

export default function ScannerPage() {
  const [mode, setMode] = useState<ScanMode>("lookup");
  const [lookupResult, setLookupResult] =
    useState<InventoryItemWithStatus | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [stockCountItems, setStockCountItems] = useState<StockCountItem[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const addToHistory = useCallback(
    (barcode: string, found: boolean) => {
      setScanHistory((prev) => [
        { barcode, timestamp: new Date(), mode, found },
        ...prev.slice(0, 9),
      ]);
    },
    [mode]
  );

  const handleLookupScan = useCallback(
    async (barcode: string) => {
      setLookupLoading(true);
      setLookupResult(null);
      try {
        const response = await apiFetch(
          `/api/inventory/items?barcode=${encodeURIComponent(barcode)}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch item");
        }
        const data = await response.json();
        const items: InventoryItemWithStatus[] = data.data ?? [];
        const found = items.find(
          (item: InventoryItemWithStatus) => item.barcode === barcode
        );
        setLookupResult(found ?? null);
        addToHistory(barcode, !!found);
        if (!found) {
          toast.warning("No item found for this barcode");
        }
      } catch {
        setLookupResult(null);
        addToHistory(barcode, false);
        toast.error("Failed to look up barcode");
      } finally {
        setLookupLoading(false);
      }
    },
    [addToHistory]
  );

  const handleStockCountScan = useCallback(
    (barcode: string) => {
      setStockCountItems((prev) => {
        const existing = prev.find((item) => item.barcode === barcode);
        if (existing) {
          toast.info(
            `"${existing.item?.name ?? barcode}" already in count — quantity increased`
          );
          return prev.map((item) =>
            item.barcode === barcode
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [{ barcode, quantity: 1, timestamp: new Date() }, ...prev];
      });
      addToHistory(barcode, true);
      toast.success(`Added ${barcode} to stock count`);
    },
    [addToHistory]
  );

  const handleScan = useCallback(
    (barcode: string) => {
      if (mode === "lookup") {
        handleLookupScan(barcode);
      } else {
        handleStockCountScan(barcode);
      }
    },
    [mode, handleLookupScan, handleStockCountScan]
  );

  const handleScannerError = useCallback((error: string) => {
    setCameraError(error);
  }, []);

  const handleQuantityChange = useCallback(
    (barcode: string, quantity: number) => {
      setStockCountItems((prev) =>
        prev.map((item) =>
          item.barcode === barcode
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        )
      );
    },
    []
  );

  const handleRemoveItem = useCallback((barcode: string) => {
    setStockCountItems((prev) =>
      prev.filter((item) => item.barcode !== barcode)
    );
  }, []);

  const handleSubmitStockCount = useCallback(async () => {
    if (stockCountItems.length === 0) {
      toast.error("No items to submit");
      return;
    }

    const toastId = toast.loading(
      `Submitting ${stockCountItems.length} items for stock count...`
    );

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Process each scanned item
      for (const scannedItem of stockCountItems) {
        try {
          // First, look up the item if we don't have the details
          let itemId = scannedItem.item?.id;

          if (!itemId) {
            const lookupResponse = await apiFetch(
              `/api/inventory/items?barcode=${encodeURIComponent(scannedItem.barcode)}`
            );
            if (!lookupResponse.ok) {
              throw new Error("Item lookup failed");
            }
            const lookupData = await lookupResponse.json();
            const items: InventoryItemWithStatus[] = lookupData.data ?? [];
            const foundItem = items.find(
              (item: InventoryItemWithStatus) =>
                item.barcode === scannedItem.barcode
            );

            if (!foundItem) {
              errors.push(`${scannedItem.barcode}: Item not found`);
              failCount++;
              continue;
            }
            itemId = foundItem.id;
          }

          // Submit the stock adjustment
          const adjustmentResponse = await apiFetch(
            "/api/inventory/stock-levels/adjust",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                inventoryItemId: itemId,
                quantity: scannedItem.quantity,
                adjustmentType: "increase",
                reason: "physical_count",
                notes: `Stock count scan at ${scannedItem.timestamp.toISOString()}`,
              }),
            }
          );

          if (!adjustmentResponse.ok) {
            const errorData = await adjustmentResponse.json();
            throw new Error(errorData.message || "Adjustment failed");
          }

          successCount++;
        } catch (error) {
          const itemName = scannedItem.item?.name || scannedItem.barcode;
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`${itemName}: ${errorMsg}`);
          failCount++;
        }
      }

      // Show results
      toast.dismiss(toastId);

      if (successCount > 0 && failCount === 0) {
        toast.success(
          `Stock count submitted successfully (${successCount} items)`
        );
        setStockCountItems([]);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(
          `Partially submitted: ${successCount} succeeded, ${failCount} failed`,
          { description: errors.slice(0, 3).join("; ") }
        );
        // Remove successful items
        setStockCountItems((prev) =>
          prev.filter((item) => {
            const itemName = item.item?.name || item.barcode;
            return errors.some((err) => err.startsWith(itemName));
          })
        );
      } else {
        toast.error(`Stock count submission failed (${failCount} items)`, {
          description: errors.slice(0, 3).join("; "),
        });
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to submit stock count");
      console.error("Stock count submission error:", error);
    }
  }, [stockCountItems]);

  const totalCountedItems = stockCountItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <OperationalPageShell
      description="Scan barcodes to look up inventory items or count stock."
      eyebrow="Inventory / Scanner"
      title="Barcode scanner"
    >

      {/* Mode Tabs */}
      <Tabs onValueChange={(v) => setMode(v as ScanMode)} value={mode}>
        <TabsList>
          <TabsTrigger value="lookup">
            <SearchIcon className="mr-2 h-4 w-4" />
            Lookup
          </TabsTrigger>
          <TabsTrigger value="stock_count">
            <PackageIcon className="mr-2 h-4 w-4" />
            Stock Count
          </TabsTrigger>
        </TabsList>

        {/* Lookup Mode */}
        <TabsContent className="mt-4 space-y-4" value="lookup">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scanner */}
            <Card tone="canvas">
              <CardHeader>
                <CardTitle>Scan Barcode</CardTitle>
                <CardDescription>
                  Point your camera at a barcode to look it up
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeScanner
                  onError={handleScannerError}
                  onScan={handleScan}
                />
                {cameraError && (
                  <p className="mt-2 text-center text-destructive text-sm">
                    {cameraError}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Result */}
            <Card tone="canvas">
              <CardHeader>
                <CardTitle>Item Result</CardTitle>
                <CardDescription>
                  {lookupLoading
                    ? "Searching..."
                    : lookupResult
                      ? "Item found"
                      : "Scan a barcode to see results"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lookupLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}
                {!lookupLoading && lookupResult && (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">
                          {lookupResult.name}
                        </p>
                        <p className="font-mono text-muted-foreground text-sm">
                          {lookupResult.item_number}
                        </p>
                      </div>
                      <Badge variant="outline">{lookupResult.category}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-medium">
                          {lookupResult.quantity_on_hand.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Unit Cost</p>
                        <p className="font-medium">
                          ${lookupResult.unit_cost.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reorder Level</p>
                        <p className="font-medium">
                          {lookupResult.reorder_level.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Value</p>
                        <p className="font-medium">
                          ${lookupResult.total_value.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {lookupResult.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {lookupResult.tags.map((tag) => (
                          <Badge
                            className="text-xs"
                            key={tag}
                            variant="secondary"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!(lookupLoading || lookupResult) && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ScanIcon className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      No item result yet. Scan a barcode to look it up.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Count Mode */}
        <TabsContent className="mt-4 space-y-4" value="stock_count">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Scanner */}
            <Card tone="canvas">
              <CardHeader>
                <CardTitle>Scan Items</CardTitle>
                <CardDescription>
                  Scan items to add them to your stock count
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeScanner
                  onError={handleScannerError}
                  onScan={handleScan}
                />
                {cameraError && (
                  <p className="mt-2 text-center text-destructive text-sm">
                    {cameraError}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Count List */}
            <Card tone="canvas">
              <CardHeader>
                <CardTitle>Count List</CardTitle>
                <CardDescription>
                  {stockCountItems.length === 0
                    ? "No items counted yet"
                    : `${stockCountItems.length} item${stockCountItems.length === 1 ? "" : "s"} · ${totalCountedItems} total units`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stockCountItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PackageIcon className="mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      Scan barcodes to add items to your count.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Barcode / Name</TableHead>
                          <TableHead className="w-[100px]">Quantity</TableHead>
                          <TableHead className="w-[40px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockCountItems.map((item) => (
                          <TableRow key={item.barcode}>
                            <TableCell>
                              <div className="font-medium font-mono text-sm">
                                {item.barcode}
                              </div>
                              {item.item && (
                                <div className="text-muted-foreground text-xs">
                                  {item.item.name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                className="w-[80px] text-center"
                                min={1}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.barcode,
                                    Number.parseInt(e.target.value, 10) || 1
                                  )
                                }
                                type="number"
                                value={item.quantity}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handleRemoveItem(item.barcode)}
                                size="sm"
                                variant="ghost"
                              >
                                <TrashIcon className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button className="w-full" onClick={handleSubmitStockCount}>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Submit Stock Count
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanHistory.map((entry, _i) => (
                  <TableRow
                    key={`${entry.barcode}-${entry.timestamp.getTime()}`}
                  >
                    <TableCell className="font-mono text-sm">
                      {entry.barcode}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {entry.timestamp.toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="text-xs" variant="outline">
                        {entry.mode === "lookup" ? "Lookup" : "Stock Count"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${entry.found ? "bg-muted/50 text-foreground" : "bg-muted/50 text-foreground"}`}
                        variant="outline"
                      >
                        {entry.found ? "Found" : "Not Found"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </OperationalPageShell>
  );
}
