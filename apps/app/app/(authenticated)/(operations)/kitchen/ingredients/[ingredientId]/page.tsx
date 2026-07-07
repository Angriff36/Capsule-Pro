"use client";

/**
 * Ingredient detail — canonical page for one ingredient. This is the missing
 * hop between recipes and stock: it shows the ingredient's allergens/storage,
 * links to its inventory item (with a governed link action when unlinked),
 * and lists the recipe versions that use it (the reverse of recipe →
 * ingredient).
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
import { ArrowLeft, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { executeCommand } from "@/app/lib/manifest-client";
import {
  getIngredient,
  listInventoryItems,
  listRecipeIngredients,
} from "@/app/lib/manifest-client.generated";

type Row = Record<string, unknown>;

export default function IngredientDetailPage() {
  const params = useParams<{ ingredientId: string }>();
  const ingredientId = params?.ingredientId ?? "";
  const [ingredient, setIngredient] = useState<Row | null>(null);
  const [usedIn, setUsedIn] = useState<Row[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Row[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ingredientResult, recipeIngredientsResult, itemsResult] =
        await Promise.all([
          getIngredient(ingredientId),
          listRecipeIngredients(),
          listInventoryItems({ limit: 500 }),
        ]);
      setIngredient((ingredientResult as unknown as Row) ?? null);
      setUsedIn(
        (recipeIngredientsResult.data as unknown as Row[]).filter(
          (row) => row.ingredientId === ingredientId
        )
      );
      setInventoryItems(itemsResult.data as unknown as Row[]);
    } catch (error) {
      console.error("Failed to load ingredient:", error);
      toast.error("Failed to load ingredient");
    } finally {
      setLoading(false);
    }
  }, [ingredientId]);

  useEffect(() => {
    load();
  }, [load]);

  const linkItem = async () => {
    if (!selectedItem) {
      return;
    }
    setLinking(true);
    try {
      await executeCommand("Ingredient", "linkInventoryItem", {
        id: ingredientId,
        inventoryItemId: selectedItem,
        userId: "ui",
      });
      toast.success("Inventory item linked");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to link item"
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

  if (!ingredient) {
    return (
      <div className="p-8">
        <p className="mb-4 text-muted-foreground">Ingredient not found.</p>
        <Button asChild variant="outline">
          <Link href="/kitchen/recipes?tab=ingredients">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to ingredients
          </Link>
        </Button>
      </div>
    );
  }

  const inventoryItemId = (ingredient.inventoryItemId as string) || "";
  const linkedItem = inventoryItems.find((item) => item.id === inventoryItemId);
  const allergens = ingredient.allergens as string | string[] | null;
  const allergenList = Array.isArray(allergens)
    ? allergens
    : (allergens ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-muted-foreground text-xs uppercase">
            Kitchen / Ingredients
          </p>
          <h1 className="font-semibold text-2xl">
            {(ingredient.name as string) || ingredientId}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {ingredient.category ? (
              <Badge variant="outline">{ingredient.category as string}</Badge>
            ) : null}
            {allergenList.map((allergen) => (
              <Badge key={allergen} variant="secondary">
                {allergen}
              </Badge>
            ))}
            {ingredient.isRecalled ? (
              <Badge variant="destructive">RECALLED</Badge>
            ) : null}
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/kitchen/recipes?tab=ingredients">
            <ArrowLeft className="mr-1 h-4 w-4" /> All ingredients
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" /> Inventory item
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inventoryItemId ? (
            <p className="text-sm">
              Stocked as{" "}
              <Link
                className="underline underline-offset-2"
                href={`/inventory/items/${inventoryItemId}`}
              >
                {(linkedItem?.name as string) || inventoryItemId}
              </Link>
              {linkedItem
                ? ` — ${Number(linkedItem.quantityOnHand ?? 0)} on hand, ${Number(linkedItem.quantityReserved ?? 0)} reserved`
                : ""}
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Not linked to an inventory item — prep demand for this
                ingredient cannot be reserved or ordered until it is.
              </p>
              <div className="flex items-center gap-2">
                <Select onValueChange={setSelectedItem} value={selectedItem}>
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Choose an inventory item…" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem
                        key={item.id as string}
                        value={item.id as string}
                      >
                        {(item.name as string) || (item.id as string)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selectedItem || linking}
                  onClick={linkItem}
                  size="sm"
                >
                  {linking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Link item"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Used in recipes ({usedIn.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {usedIn.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Not used by any recipe version.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe version</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usedIn.map((row) => (
                  <TableRow key={row.id as string}>
                    <TableCell className="font-mono text-xs">
                      {((row.recipeVersionId as string) || "").slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(row.quantity ?? 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {(row.preparationNotes as string) || ""}
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
