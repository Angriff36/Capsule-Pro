"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import type { EncodingSlot, FieldType } from "../lib/chart-catalog";

interface ColumnInfo {
  name: string;
  detectedType: FieldType;
  sampleValues: string[];
}

interface ColumnMapperProps {
  /** Available columns from the uploaded data */
  columns: ColumnInfo[];
  /** Encoding slots from the selected chart type */
  encodings: EncodingSlot[];
  /** Current field mappings: placeholder -> column name */
  mappings: Record<string, string>;
  /** Called when a mapping changes */
  onMappingChange: (placeholder: string, columnName: string) => void;
}

const TYPE_LABELS: Record<FieldType, string> = {
  quantitative: "Numeric",
  nominal: "Category",
  ordinal: "Ordered",
  temporal: "Date/Time",
};

const TYPE_COLORS: Record<FieldType, string> = {
  quantitative: "bg-blue-100 text-blue-800",
  nominal: "bg-green-100 text-green-800",
  ordinal: "bg-amber-100 text-amber-800",
  temporal: "bg-purple-100 text-purple-800",
};

/**
 * Detect the Vega-Lite field type from sample values.
 */
function detectFieldType(values: unknown[]): FieldType {
  const nonNull = values.filter(
    (v) => v !== null && v !== undefined && v !== ""
  );
  if (nonNull.length === 0) {
    return "nominal";
  }

  // Check if all values are dates
  const dateCount = nonNull.filter((v) => {
    if (v instanceof Date) {
      return true;
    }
    if (typeof v === "string") {
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && v.length > 6;
    }
    return false;
  }).length;
  if (dateCount > nonNull.length * 0.7) {
    return "temporal";
  }

  // Check if all values are numbers
  const numCount = nonNull.filter((v) => {
    if (typeof v === "number") {
      return true;
    }
    if (typeof v === "string") {
      return !Number.isNaN(Number(v)) && v.trim() !== "";
    }
    return false;
  }).length;
  if (numCount > nonNull.length * 0.7) {
    return "quantitative";
  }

  // Check cardinality for ordinal vs nominal
  const unique = new Set(nonNull.map(String));
  if (unique.size <= 10 && unique.size < nonNull.length * 0.3) {
    return "ordinal";
  }

  return "nominal";
}

/**
 * Build ColumnInfo array from raw data rows.
 */
function buildColumnInfo(rows: Record<string, unknown>[]): ColumnInfo[] {
  if (rows.length === 0) {
    return [];
  }

  const columnNames = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columnNames.add(key);
    }
  }

  return Array.from(columnNames).map((name) => {
    const values = rows.slice(0, 100).map((row) => row[name]);
    const detectedType = detectFieldType(values);
    const sampleValues = values
      .filter((v) => v !== null && v !== undefined)
      .slice(0, 3)
      .map(String);
    return { name, detectedType, sampleValues };
  });
}

function ColumnMapper({
  columns,
  encodings,
  mappings,
  onMappingChange,
}: ColumnMapperProps) {
  return (
    <div className="space-y-3">
      {encodings.map((slot) => {
        const compatibleColumns = columns.filter((col) =>
          slot.acceptedTypes.includes(col.detectedType)
        );
        // Also show all columns as fallback
        const otherColumns = columns.filter(
          (col) => !slot.acceptedTypes.includes(col.detectedType)
        );

        return (
          <div className="space-y-1" key={slot.placeholder}>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{slot.label}</Label>
              {slot.required && (
                <Badge className="text-[10px] px-1 py-0" variant="outline">
                  Required
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                ({slot.acceptedTypes.map((t) => TYPE_LABELS[t]).join(", ")})
              </span>
            </div>
            <Select
              onValueChange={(value) =>
                onMappingChange(
                  slot.placeholder,
                  value === "__none__" ? "" : value
                )
              }
              value={mappings[slot.placeholder] ?? ""}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select column..." />
              </SelectTrigger>
              <SelectContent>
                {!slot.required && (
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                )}
                {compatibleColumns.map((col) => (
                  <SelectItem key={col.name} value={col.name}>
                    <div className="flex items-center gap-2">
                      <span>{col.name}</span>
                      <span
                        className={`text-[10px] px-1 rounded ${TYPE_COLORS[col.detectedType]}`}
                      >
                        {TYPE_LABELS[col.detectedType]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {otherColumns.map((col) => (
                  <SelectItem key={col.name} value={col.name}>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{col.name}</span>
                      <span
                        className={`text-[10px] px-1 rounded ${TYPE_COLORS[col.detectedType]}`}
                      >
                        {TYPE_LABELS[col.detectedType]}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

export { buildColumnInfo, ColumnMapper, detectFieldType };
export type { ColumnInfo, ColumnMapperProps };
