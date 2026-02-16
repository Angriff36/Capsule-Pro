"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Copy, Download, ImageIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TopLevelSpec } from "vega-lite";
import { isFacetedSpec } from "../lib/chart-catalog";

/* ------------------------------------------------------------------ */
/*  Minimal type surface for the vega-embed result                    */
/* ------------------------------------------------------------------ */

interface EmbedResultView {
  toCanvas: (scaleFactor?: number) => Promise<HTMLCanvasElement>;
  toSVG: () => Promise<string>;
  finalize: () => void;
}

interface EmbedResult {
  view: EmbedResultView;
  finalize: () => void;
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

interface VegaChartProps {
  /** Vega-Lite specification */
  spec: TopLevelSpec;
  /** Override data values (merged into spec.data.values) */
  data?: Record<string, unknown>[];
  /** Chart title shown in card header */
  title?: string;
  /** Chart description shown in card header */
  description?: string;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show export action buttons */
  showActions?: boolean;
  /** Whether to wrap in a Card */
  asCard?: boolean;
  /** Additional CSS class */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

/**
 * Reusable Vega-Lite chart component.
 *
 * Lazy-loads vega-embed on first render and renders the spec as canvas.
 * Provides built-in export (PNG, SVG) and copy-to-clipboard actions.
 */
export function VegaChart({
  spec,
  data,
  title,
  description,
  height = 300,
  showActions = true,
  asCard = true,
  className,
}: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<EmbedResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Stabilise the spec identity so the effect only re-runs when the spec
  // actually changes (not on every parent render).
  const specJson = useMemo(() => JSON.stringify(spec), [spec]);
  const dataJson = useMemo(() => (data ? JSON.stringify(data) : null), [data]);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      const el = containerRef.current;
      if (!el) return;

      setIsLoading(true);
      setError(null);

      try {
        const vegaEmbed = (await import("vega-embed")).default;

        // Parse the stabilised spec
        const parsedSpec = JSON.parse(specJson) as TopLevelSpec;
        const parsedData = dataJson
          ? (JSON.parse(dataJson) as Record<string, unknown>[])
          : undefined;

        // Build the final spec — use a fixed pixel width derived from the
        // container so vega never has to measure a hidden/zero-width element.
        const containerWidth = el.offsetWidth || el.clientWidth || 500;
        const faceted = isFacetedSpec(
          parsedSpec as unknown as Record<string, unknown>
        );

        // Faceted / concatenated specs manage their own sub-view sizes and
        // must NOT have top-level width/height/autosize.
        const finalSpec: TopLevelSpec = {
          ...parsedSpec,
          ...(faceted
            ? {}
            : {
                width: containerWidth - 40,
                height,
                autosize: { type: "fit", contains: "padding" },
              }),
          ...(parsedData ? { data: { values: parsedData } } : {}),
        } as TopLevelSpec;

        if (cancelled) return;

        // Clean up previous render
        if (resultRef.current) {
          resultRef.current.finalize();
          resultRef.current = null;
        }

        const result = await vegaEmbed(el, finalSpec, {
          actions: false,
          renderer: "canvas",
          config: {
            background: "#ffffff",
            axis: {
              labelFontSize: 11,
              titleFontSize: 12,
              labelColor: "#64748b",
              titleColor: "#334155",
              gridColor: "#e2e8f0",
              domainColor: "#cbd5e1",
            },
            title: {
              fontSize: 14,
              fontWeight: "bold" as const,
              color: "#0f172a",
            },
            mark: { color: "hsl(221, 83%, 53%)" },
            range: {
              category: [
                "#3b82f6",
                "#ef4444",
                "#22c55e",
                "#f59e0b",
                "#8b5cf6",
                "#ec4899",
                "#06b6d4",
                "#f97316",
                "#14b8a6",
                "#6366f1",
              ],
            },
          },
        });

        if (cancelled) {
          result.finalize();
          return;
        }

        resultRef.current = result as unknown as EmbedResult;
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to render chart";
          setError(message);
          console.error("[VegaChart] render error:", err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      if (resultRef.current) {
        resultRef.current.finalize();
        resultRef.current = null;
      }
    };
  }, [specJson, dataJson, height]);

  /* ---- Export handlers ---- */

  const handleExportPng = useCallback(async () => {
    if (!resultRef.current) return;
    try {
      const canvas = await resultRef.current.view.toCanvas(2);
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title ?? "chart"}.png`;
      link.click();
    } catch (err) {
      console.error("[VegaChart] PNG export error:", err);
    }
  }, [title]);

  const handleExportSvg = useCallback(async () => {
    if (!resultRef.current) return;
    try {
      const svg = await resultRef.current.view.toSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title ?? "chart"}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[VegaChart] SVG export error:", err);
    }
  }, [title]);

  const handleCopyToClipboard = useCallback(async () => {
    if (!resultRef.current) return;
    try {
      const canvas = await resultRef.current.view.toCanvas(2);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }, "image/png");
    } catch {
      // Clipboard API may not be available in all contexts
    }
  }, []);

  /* ---- Render ---- */

  const chartContent = (
    <div className={className}>
      {/* The container is always in the DOM so vega-embed can measure it.
          Loading / error overlays sit on top via absolute positioning. */}
      <div className="relative w-full" style={{ minHeight: height }}>
        {isLoading && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg animate-pulse z-10"
            style={{ height }}
          >
            <span className="text-sm text-muted-foreground">
              Loading chart&hellip;
            </span>
          </div>
        )}
        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-destructive/10 rounded-lg z-10"
            style={{ height }}
          >
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}
        <div className="w-full" ref={containerRef} />
      </div>

      {showActions && !isLoading && !error && (
        <div className="flex items-center gap-1 mt-2">
          <Button
            onClick={handleExportPng}
            size="sm"
            title="Download PNG"
            variant="ghost"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            PNG
          </Button>
          <Button
            onClick={handleExportSvg}
            size="sm"
            title="Download SVG"
            variant="ghost"
          >
            <ImageIcon className="h-3.5 w-3.5 mr-1" />
            SVG
          </Button>
          <Button
            onClick={handleCopyToClipboard}
            size="sm"
            title="Copy to clipboard"
            variant="ghost"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copyFeedback ? "Copied!" : "Copy"}
          </Button>
        </div>
      )}
    </div>
  );

  if (!asCard) return chartContent;

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{chartContent}</CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Spec helpers for the dashboard tabs                               */
/* ------------------------------------------------------------------ */

/**
 * Helper to build a simple bar chart spec from label/value data.
 */
export function barChartSpec(options?: {
  xTitle?: string;
  yTitle?: string;
  color?: string;
  showCurrency?: boolean;
}): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: { type: "bar", cornerRadiusTopLeft: 6, cornerRadiusTopRight: 6 },
    encoding: {
      x: {
        field: "label",
        type: "nominal",
        axis: { labelAngle: -45, title: options?.xTitle ?? null },
        sort: null,
      },
      y: {
        field: "value",
        type: "quantitative",
        axis: {
          title: options?.yTitle ?? null,
          format: options?.showCurrency ? "$,.0f" : ",.0f",
        },
      },
      color: { value: options?.color ?? "hsl(221, 83%, 53%)" },
      tooltip: [
        { field: "label", type: "nominal" },
        {
          field: "value",
          type: "quantitative",
          format: options?.showCurrency ? "$,.2f" : ",.0f",
        },
      ],
    },
  } as TopLevelSpec;
}

/**
 * Helper to build a simple line chart spec from label/value data.
 */
export function lineChartSpec(options?: {
  xTitle?: string;
  yTitle?: string;
  color?: string;
  showCurrency?: boolean;
}): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    mark: { type: "line", point: true, strokeWidth: 2 },
    encoding: {
      x: {
        field: "label",
        type: "ordinal",
        axis: { title: options?.xTitle ?? null },
        sort: null,
      },
      y: {
        field: "value",
        type: "quantitative",
        axis: {
          title: options?.yTitle ?? null,
          format: options?.showCurrency ? "$,.0f" : ",.0f",
        },
      },
      color: { value: options?.color ?? "hsl(221, 83%, 53%)" },
      tooltip: [
        { field: "label", type: "nominal" },
        {
          field: "value",
          type: "quantitative",
          format: options?.showCurrency ? "$,.2f" : ",.0f",
        },
      ],
    },
  } as TopLevelSpec;
}
