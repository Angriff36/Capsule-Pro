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
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { TopLevelSpec } from "vega-lite";
import {
  buildSpec,
  CATEGORIES,
  CHART_TYPES,
  type ChartCategory,
  type ChartTypeDefinition,
} from "../lib/chart-catalog";
import {
  buildColumnInfo,
  type ColumnInfo,
  ColumnMapper,
} from "./column-mapper";
import { VegaChart } from "./vega-chart";

interface ChartBuilderProps {
  /** Raw data rows from the uploaded file */
  data: Record<string, unknown>[];
}

function ChartBuilder({ data }: ChartBuilderProps) {
  const [selectedChart, setSelectedChart] =
    useState<ChartTypeDefinition | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [chartTitle, setChartTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ChartCategory | null>(
    null
  );

  const columns: ColumnInfo[] = useMemo(
    () => buildColumnInfo(data as Record<string, unknown>[]),
    [data]
  );

  const filteredCharts = useMemo(() => {
    let charts = CHART_TYPES;
    if (activeCategory) {
      charts = charts.filter((c) => c.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      charts = charts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.includes(q))
      );
    }
    return charts;
  }, [activeCategory, searchQuery]);

  const handleSelectChart = useCallback(
    (chart: ChartTypeDefinition) => {
      setSelectedChart(chart);
      // Auto-map first compatible column to each required encoding
      const autoMappings: Record<string, string> = {};
      const usedColumns = new Set<string>();
      for (const slot of chart.encodings) {
        if (!slot.required) continue;
        const match = columns.find(
          (col) =>
            slot.acceptedTypes.includes(col.detectedType) &&
            !usedColumns.has(col.name)
        );
        if (match) {
          autoMappings[slot.placeholder] = match.name;
          usedColumns.add(match.name);
        }
      }
      setMappings(autoMappings);
    },
    [columns]
  );

  const handleMappingChange = useCallback(
    (placeholder: string, columnName: string) => {
      setMappings((prev) => {
        const next = { ...prev };
        if (columnName) {
          next[placeholder] = columnName;
        } else {
          delete next[placeholder];
        }
        return next;
      });
    },
    []
  );

  // Check if all required encodings are mapped
  const requiredSlots =
    selectedChart?.encodings.filter((e) => e.required) ?? [];
  const allRequiredMapped = requiredSlots.every(
    (slot) => mappings[slot.placeholder]
  );

  // Build the spec when ready
  const renderedSpec: TopLevelSpec | null = useMemo(() => {
    if (!(selectedChart && allRequiredMapped)) return null;
    try {
      return buildSpec(selectedChart, mappings, data, {
        title: chartTitle || undefined,
      });
    } catch {
      return null;
    }
  }, [selectedChart, mappings, data, chartTitle, allRequiredMapped]);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr_260px]">
      {/* Left: Chart Type Selector */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search charts..."
            value={searchQuery}
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            className="cursor-pointer text-xs"
            onClick={() => setActiveCategory(null)}
            variant={activeCategory === null ? "default" : "outline"}
          >
            All
          </Badge>
          {CATEGORIES.map((cat) => (
            <Badge
              className="cursor-pointer text-xs"
              key={cat.id}
              onClick={() =>
                setActiveCategory(activeCategory === cat.id ? null : cat.id)
              }
              variant={activeCategory === cat.id ? "default" : "outline"}
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        <Separator />

        {/* Chart type grid */}
        <div className="max-h-[600px] overflow-y-auto space-y-1 pr-1">
          {filteredCharts.map((chart) => (
            <button
              className={`w-full text-left rounded-lg border p-2.5 transition-colors hover:bg-accent ${
                selectedChart?.id === chart.id
                  ? "border-primary bg-accent"
                  : "border-transparent"
              }`}
              key={chart.id}
              onClick={() => handleSelectChart(chart)}
              type="button"
            >
              <div className="text-sm font-medium">{chart.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {chart.description}
              </div>
            </button>
          ))}
          {filteredCharts.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No charts match your search.
            </div>
          )}
        </div>
      </div>

      {/* Center: Chart Preview */}
      <div className="space-y-4">
        {renderedSpec ? (
          <VegaChart
            asCard={false}
            height={400}
            showActions
            spec={renderedSpec}
            title={chartTitle || selectedChart?.name}
          />
        ) : selectedChart ? (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px]">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Map the required columns to see a preview.
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {requiredSlots
                    .filter((s) => !mappings[s.placeholder])
                    .map((s) => (
                      <Badge key={s.placeholder} variant="outline">
                        {s.label}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px]">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Select a chart type</p>
                <p className="text-sm text-muted-foreground">
                  Choose from {CHART_TYPES.length} chart types in the sidebar,
                  then map your data columns.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data preview */}
        {data.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardDescription>
                {data.length} rows &middot; {columns.length} columns
              </CardDescription>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {columns.slice(0, 20).map((col) => (
                  <Badge className="text-xs" key={col.name} variant="secondary">
                    {col.name}
                    <span className="ml-1 opacity-60">
                      ({col.detectedType.slice(0, 4)})
                    </span>
                  </Badge>
                ))}
                {columns.length > 20 && (
                  <Badge className="text-xs" variant="outline">
                    +{columns.length - 20} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Configuration Panel */}
      <div className="space-y-4">
        {selectedChart ? (
          <>
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">{selectedChart.name}</CardTitle>
                <CardDescription className="text-xs">
                  {selectedChart.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Chart Title</Label>
                  <Input
                    className="h-8 text-sm"
                    onChange={(e) => setChartTitle(e.target.value)}
                    placeholder="Optional title..."
                    value={chartTitle}
                  />
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Column Mappings</Label>
                </div>
                <ColumnMapper
                  columns={columns}
                  encodings={selectedChart.encodings}
                  mappings={mappings}
                  onMappingChange={handleMappingChange}
                />
              </CardContent>
            </Card>

            {renderedSpec && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Use the PNG, SVG, or Copy buttons below the chart to export.
                    You can also right-click the chart to save the image.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => window.print()}
                    size="sm"
                    variant="outline"
                  >
                    Print Page
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Select a chart type from the sidebar to configure it.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export { ChartBuilder };
