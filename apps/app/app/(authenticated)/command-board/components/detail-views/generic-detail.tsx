"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import { ExternalLink, Info } from "lucide-react";
import Link from "next/link";
import type { EntityType, ResolvedEntity } from "../../types/entities";
import { ENTITY_TYPE_LABELS } from "../../types/entities";

// ============================================================================
// Generic Detail View — fallback for entity types without a specialized view
// ============================================================================

interface GenericDetailProps {
  entity: ResolvedEntity;
}

/** Map entity types to their module page paths */
const entityTypeLinks: Partial<Record<EntityType, string>> = {
  inventory_item: "/inventory",
  recipe: "/kitchen/recipes",
  dish: "/kitchen/dishes",
  proposal: "/proposals",
  shipment: "/shipments",
  note: "/notes",
};

/** Map entity types to their link labels */
const entityTypeLinkLabels: Partial<Record<EntityType, string>> = {
  inventory_item: "Open in Inventory",
  recipe: "Open in Kitchen",
  dish: "Open in Kitchen",
  proposal: "Open in Proposals",
  shipment: "Open in Shipments",
  note: "Open in Notes",
};

/** Format a value for display in the key-value list */
function formatValue(value: unknown): string {
  if (value == null) return "N/A";
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(value);
  }
  if (typeof value === "number") {
    return value.toLocaleString("en-US");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }
  return String(value);
}

/** Human-readable labels for common field names */
const fieldLabels: Record<string, string> = {
  id: "ID",
  name: "Name",
  title: "Title",
  category: "Category",
  status: "Status",
  quantityOnHand: "Qty on Hand",
  parLevel: "Par Level",
  unit: "Unit",
  cuisineType: "Cuisine",
  pricePerPerson: "Price/Person",
  serviceStyle: "Service Style",
  dietaryTags: "Dietary Tags",
  proposalNumber: "Proposal #",
  total: "Total",
  clientName: "Client",
  shipmentNumber: "Shipment #",
  eventTitle: "Event",
  supplierName: "Supplier",
  itemCount: "Items",
  content: "Content",
  color: "Color",
  tags: "Tags",
};

/** Regex for splitting camelCase field names into words */
const CAMEL_CASE_SPLIT = /([A-Z])/g;

/** Regex for capitalizing the first character */
const FIRST_CHAR = /^./;

/** Get a human-readable label for a field key */
function getFieldLabel(key: string): string {
  return (
    fieldLabels[key] ??
    key
      .replace(CAMEL_CASE_SPLIT, " $1")
      .replace(FIRST_CHAR, (s) => s.toUpperCase())
      .trim()
  );
}

/** Extract displayable key-value pairs from entity data, excluding internal fields */
function extractFields(
  data: Record<string, unknown>
): Array<{ label: string; value: string }> {
  const excludeKeys = new Set(["id", "type", "entityType"]);
  const fields: Array<{ label: string; value: string }> = [];

  for (const [key, value] of Object.entries(data)) {
    if (excludeKeys.has(key)) continue;

    // Skip nested objects (like latestVersion) — flatten them instead
    if (value != null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [nestedKey, nestedValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        fields.push({
          label: getFieldLabel(nestedKey),
          value: formatValue(nestedValue),
        });
      }
      continue;
    }

    fields.push({
      label: getFieldLabel(key),
      value: formatValue(value),
    });
  }

  return fields;
}

export function GenericDetail({ entity }: GenericDetailProps) {
  const typeLabel = ENTITY_TYPE_LABELS[entity.type];
  const linkPath = entityTypeLinks[entity.type];
  const linkLabel = entityTypeLinkLabels[entity.type] ?? "Open Full Page";
  const fields = extractFields(entity.data as unknown as Record<string, unknown>);

  return (
    <div className="space-y-4">
      <Separator />

      {/* Key-Value Fields */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Info className="size-4 text-muted-foreground" />
          {typeLabel} Details
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          {fields.map((field) => (
            <div
              className="flex items-center justify-between gap-4"
              key={field.label}
            >
              <span className="shrink-0 text-muted-foreground">
                {field.label}
              </span>
              <span className="truncate text-right font-medium">
                {field.value}
              </span>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-muted-foreground">No details available</p>
          )}
        </div>
      </div>

      {/* Open Full Page */}
      {linkPath && (
        <>
          <Separator />
          <Button asChild className="w-full" variant="outline">
            <Link href={linkPath}>
              <ExternalLink className="mr-2 size-4" />
              {linkLabel}
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
