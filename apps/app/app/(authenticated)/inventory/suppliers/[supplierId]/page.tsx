"use client";

/**
 * InventorySupplier detail — canonical page for one inventory supplier.
 * Shows contact/terms/status, the purchasing-Vendor bridge (linkVendor —
 * required before prep-demand drafts for this supplier can convert to POs),
 * the supplier's catalog entries (SKU/pack/price, each linked to its mapped
 * inventory item), and the items this supplier supplies.
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { ArrowLeft, Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { executeCommand } from "@/app/lib/manifest-client";
import {
  getInventorySupplier,
  listInventoryItems,
  listVendorCatalogs,
  listVendors,
} from "@/app/lib/manifest-client.generated";

type Row = Record<string, unknown>;

export default function InventorySupplierDetailPage() {
  const params = useParams<{ supplierId: string }>();
  const supplierId = params?.supplierId ?? "";
  const [supplier, setSupplier] = useState<Row | null>(null);
  const [catalogs, setCatalogs] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Row[]>([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supplierResult, catalogResult, itemsResult, vendorsResult] =
        await Promise.all([
          getInventorySupplier(supplierId),
          listVendorCatalogs(),
          listInventoryItems({ limit: 500 }),
          listVendors(),
        ]);
      setSupplier((supplierResult as unknown as Row) ?? null);
      setCatalogs(
        (catalogResult.data as unknown as Row[]).filter(
          (row) => row.supplierId === supplierId
        )
      );
      setItems(
        (itemsResult.data as unknown as Row[]).filter(
          (row) => row.supplierId === supplierId
        )
      );
      setVendors(vendorsResult.data as unknown as Row[]);
    } catch (error) {
      console.error("Failed to load supplier:", error);
      toast.error("Failed to load supplier");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    load();
  }, [load]);

  const linkVendor = async () => {
    if (!selectedVendor) {
      return;
    }
    setLinking(true);
    try {
      await executeCommand("InventorySupplier", "linkVendor", {
        id: supplierId,
        vendorId: selectedVendor,
      });
      toast.success("Purchasing vendor linked");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to link vendor"
      );
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-8">
        <p className="mb-4 text-muted-foreground">Supplier not found.</p>
        <Button asChild variant="outline">
          <Link href="/inventory/items">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to inventory
          </Link>
        </Button>
      </div>
    );
  }

  const linkedVendorId = (supplier.vendorId as string) || "";
  const linkedVendor = vendors.find((v) => v.id === linkedVendorId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-muted-foreground text-xs uppercase">
            Inventory / Suppliers
          </p>
          <h1 className="font-semibold text-2xl">
            {(supplier.name as string) || supplierId}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">
              {(supplier.qualificationStatus as string) || "pending"}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {(supplier.supplierNumber as string) || ""} ·{" "}
              {(supplier.paymentTerms as string) || ""}
            </span>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/procurement/weekly-ordering">Weekly ordering</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Purchasing vendor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {linkedVendorId ? (
            <p className="text-sm">
              Linked to{" "}
              <Link
                className="underline underline-offset-2"
                href={`/procurement/vendors/${linkedVendorId}`}
              >
                {(linkedVendor?.name as string) || linkedVendorId}
              </Link>{" "}
              — draft orders for this supplier can be converted to purchase
              orders.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              No purchasing vendor linked. Draft orders for this supplier cannot
              be converted to purchase orders until you link one.
            </p>
          )}
          <div className="flex items-center gap-2">
            <Select onValueChange={setSelectedVendor} value={selectedVendor}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Choose a purchasing vendor…" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem
                    key={vendor.id as string}
                    value={vendor.id as string}
                  >
                    {(vendor.name as string) || (vendor.id as string)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedVendor || linking}
              onClick={linkVendor}
              size="sm"
            >
              {linking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : linkedVendorId ? (
                "Re-link"
              ) : (
                "Link vendor"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalog ({catalogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {catalogs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No catalog entries. Catalog entries (SKU, pack size, price) are
              required for prep-demand ordering — items without one land on the
              UNRESOLVED draft.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">MOQ / multiple</TableHead>
                  <TableHead>Mapped inventory item</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogs.map((entry) => (
                  <TableRow key={entry.id as string}>
                    <TableCell>{entry.itemName as string}</TableCell>
                    <TableCell>
                      {(entry.supplierSku as string) ||
                        (entry.itemNumber as string)}
                    </TableCell>
                    <TableCell>{entry.unitOfMeasure as string}</TableCell>
                    <TableCell className="text-right">
                      ${Number(entry.baseUnitCost ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(entry.minimumOrderQuantity ?? 0)} /{" "}
                      {Number(entry.orderMultiple ?? 0)}
                    </TableCell>
                    <TableCell>
                      {entry.inventoryItemId ? (
                        <Link
                          className="underline-offset-2 hover:underline"
                          href={`/inventory/items/${entry.inventoryItemId as string}`}
                        >
                          {(entry.inventoryItemId as string).slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">unmapped</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items supplied ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No inventory items are mapped to this supplier yet (set the
              supplier on an inventory item to route its purchase demand here).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id as string}>
                    <TableCell>
                      <Link
                        className="underline-offset-2 hover:underline"
                        href={`/inventory/items/${item.id as string}`}
                      >
                        {item.name as string}
                      </Link>
                    </TableCell>
                    <TableCell>{item.item_number as string}</TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantityOnHand ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(item.quantityReserved ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
