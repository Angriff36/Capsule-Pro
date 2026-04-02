"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Trash2 } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { formatCurrency } from "./po-shared";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface POItem {
  id: string;
  item_id: string;
  item_name: string | null;
  item_number: string | null;
  unit_of_measure: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  quality_status: string | null;
}

export interface EditableLineItem {
  itemId: string;
  itemName: string;
  itemNumber: string;
  unitOfMeasure: string;
  quantityOrdered: number;
  unitCost: number;
}

/* ------------------------------------------------------------------ */
/*  Display-only line items (used in detail view)                      */
/* ------------------------------------------------------------------ */

interface DisplayLineItemsProps {
  items: POItem[];
}

export function POLineItemsDisplay({ items }: DisplayLineItemsProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="text-right">Ordered</TableHead>
          <TableHead className="text-right">Received</TableHead>
          <TableHead className="text-right">Unit Cost</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const isComplete =
            Number(item.quantity_received) >= Number(item.quantity_ordered);
          return (
            <TableRow key={item.id}>
              <TableCell>
                <div>
                  <span className="font-medium">
                    {item.item_name || item.item_id}
                  </span>
                  {item.item_number && (
                    <p className="text-xs text-muted-foreground">
                      {item.item_number}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {Number(item.quantity_ordered)} {item.unit_of_measure || ""}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    isComplete
                      ? "text-green-600 font-medium"
                      : "text-amber-600"
                  }
                >
                  {Number(item.quantity_received)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.unit_cost)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.total_cost)}
              </TableCell>
              <TableCell>
                {isComplete ? (
                  <Badge className="bg-green-100 text-green-700">Complete</Badge>
                ) : Number(item.quantity_received) > 0 ? (
                  <Badge className="bg-amber-100 text-amber-700">Partial</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-700">Pending</Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/*  Editable line items (used in create / edit PO forms)               */
/* ------------------------------------------------------------------ */

interface EditableLineItemsProps {
  items: EditableLineItem[];
  onUpdate: (itemId: string, field: "quantityOrdered" | "unitCost", value: string) => void;
  onRemove: (itemId: string) => void;
}

export function POLineItemsEditable({
  items,
  onUpdate,
  onRemove,
}: EditableLineItemsProps) {
  if (items.length === 0) {
    return null; // parent renders empty state
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead className="w-[120px] text-right">Quantity</TableHead>
          <TableHead className="w-[120px] text-right">Unit Cost</TableHead>
          <TableHead className="w-[120px] text-right">Total</TableHead>
          <TableHead className="w-[60px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((li) => (
          <TableRow key={li.itemId}>
            <TableCell>
              <div>
                <span className="font-medium">{li.itemName}</span>
                <p className="text-xs text-muted-foreground">
                  {li.itemNumber} · {li.unitOfMeasure}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={li.quantityOrdered}
                onChange={(e) =>
                  onUpdate(li.itemId, "quantityOrdered", e.target.value)
                }
                className="w-24 ml-auto text-right"
              />
            </TableCell>
            <TableCell className="text-right">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={li.unitCost}
                onChange={(e) =>
                  onUpdate(li.itemId, "unitCost", e.target.value)
                }
                className="w-24 ml-auto text-right"
              />
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(li.quantityOrdered * li.unitCost)}
            </TableCell>
            <TableCell>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700"
                onClick={() => onRemove(li.itemId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
