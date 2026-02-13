/**
 * Vega-Lite Chart Catalog
 *
 * 50+ chart types organized into categories, each with a Vega-Lite spec
 * template that can be populated with user data via column mappings.
 *
 * Encoding field values use placeholder strings like "FIELD_X", "FIELD_Y",
 * "FIELD_COLOR" etc. The chart builder replaces these with actual column names.
 */

import type { TopLevelSpec } from "vega-lite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FieldType = "quantitative" | "nominal" | "ordinal" | "temporal";

interface EncodingSlot {
  /** Slot name shown in UI */
  label: string;
  /** Placeholder field name in the spec template */
  placeholder: string;
  /** Accepted Vega-Lite data types */
  acceptedTypes: FieldType[];
  /** Whether this slot must be filled */
  required: boolean;
}

interface ChartTypeDefinition {
  id: string;
  name: string;
  category: ChartCategory;
  description: string;
  /** Vega-Lite spec template with placeholder field names */
  spec: TopLevelSpec;
  /** Encoding slots the user must/can fill */
  encodings: EncodingSlot[];
  /** Tags for search */
  tags: string[];
}

type ChartCategory =
  | "bar"
  | "histogram"
  | "scatter"
  | "line"
  | "area"
  | "table"
  | "circular"
  | "statistical"
  | "advanced"
  | "multiview";

interface CategoryMeta {
  id: ChartCategory;
  label: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

const CATEGORIES: CategoryMeta[] = [
  {
    id: "bar",
    label: "Bar Charts",
    description: "Compare values across categories",
  },
  {
    id: "histogram",
    label: "Histograms & Density",
    description: "Distribution of values",
  },
  {
    id: "scatter",
    label: "Scatter & Strip",
    description: "Relationships between variables",
  },
  {
    id: "line",
    label: "Line Charts",
    description: "Trends over time or ordered data",
  },
  {
    id: "area",
    label: "Area Charts",
    description: "Cumulative or stacked trends",
  },
  {
    id: "table",
    label: "Table Plots",
    description: "Heatmaps and matrix displays",
  },
  {
    id: "circular",
    label: "Circular Plots",
    description: "Proportions and parts of a whole",
  },
  {
    id: "statistical",
    label: "Statistical",
    description: "Box plots, error bars, regressions",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Waterfall, candlestick, dual-axis",
  },
  {
    id: "multiview",
    label: "Multi-View",
    description: "Faceted and concatenated displays",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const X_SLOT: EncodingSlot = {
  label: "X Axis",
  placeholder: "FIELD_X",
  acceptedTypes: ["nominal", "ordinal", "temporal", "quantitative"],
  required: true,
};

const Y_SLOT: EncodingSlot = {
  label: "Y Axis",
  placeholder: "FIELD_Y",
  acceptedTypes: ["quantitative"],
  required: true,
};

const COLOR_SLOT: EncodingSlot = {
  label: "Color",
  placeholder: "FIELD_COLOR",
  acceptedTypes: ["nominal", "ordinal"],
  required: false,
};

const SIZE_SLOT: EncodingSlot = {
  label: "Size",
  placeholder: "FIELD_SIZE",
  acceptedTypes: ["quantitative"],
  required: false,
};

const THETA_SLOT: EncodingSlot = {
  label: "Value",
  placeholder: "FIELD_THETA",
  acceptedTypes: ["quantitative"],
  required: true,
};

const FACET_SLOT: EncodingSlot = {
  label: "Facet",
  placeholder: "FIELD_FACET",
  acceptedTypes: ["nominal", "ordinal"],
  required: false,
};

// ---------------------------------------------------------------------------
// Chart definitions
// ---------------------------------------------------------------------------

const CHART_TYPES: ChartTypeDefinition[] = [
  // =========================================================================
  // BAR CHARTS
  // =========================================================================
  {
    id: "bar-simple",
    name: "Simple Bar Chart",
    category: "bar",
    description: "Vertical bars comparing values across categories.",
    tags: ["bar", "comparison", "categorical"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
      COLOR_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar", cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
      encoding: {
        x: { field: "FIELD_X", type: "nominal", sort: null },
        y: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bar-horizontal",
    name: "Horizontal Bar Chart",
    category: "bar",
    description: "Horizontal bars, useful for long category labels.",
    tags: ["bar", "horizontal", "comparison"],
    encodings: [
      { ...Y_SLOT, label: "Category (Y)", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_X" },
      { ...X_SLOT, label: "Value (X)", acceptedTypes: ["quantitative"], placeholder: "FIELD_Y" },
      COLOR_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar", cornerRadiusEnd: 4 },
      encoding: {
        y: { field: "FIELD_X", type: "nominal", sort: "-x" },
        x: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bar-grouped",
    name: "Grouped Bar Chart",
    category: "bar",
    description: "Side-by-side bars grouped by a color category.",
    tags: ["bar", "grouped", "comparison", "multi-series"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar", cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        xOffset: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bar-stacked",
    name: "Stacked Bar Chart",
    category: "bar",
    description: "Bars stacked by a color category showing totals and parts.",
    tags: ["bar", "stacked", "composition"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar" },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "quantitative", stack: "zero" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bar-normalized",
    name: "100% Stacked Bar Chart",
    category: "bar",
    description: "Normalized stacked bars showing percentage composition.",
    tags: ["bar", "stacked", "normalized", "percentage"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar" },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "quantitative", stack: "normalize" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bar-with-labels",
    name: "Bar Chart with Labels",
    category: "bar",
    description: "Bars with value labels displayed on top.",
    tags: ["bar", "labels", "annotated"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "bar", cornerRadiusTopLeft: 4, cornerRadiusTopRight: 4 },
          encoding: {
            x: { field: "FIELD_X", type: "nominal", sort: null },
            y: { field: "FIELD_Y", type: "quantitative" },
          },
        },
        {
          mark: { type: "text", dy: -8, fontSize: 11 },
          encoding: {
            x: { field: "FIELD_X", type: "nominal", sort: null },
            y: { field: "FIELD_Y", type: "quantitative" },
            text: { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
          },
        },
      ],
    } as TopLevelSpec,
  },
  {
    id: "bar-negative",
    name: "Bar Chart with Negative Values",
    category: "bar",
    description: "Bars that extend above and below a zero baseline.",
    tags: ["bar", "negative", "diverging"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar" },
      encoding: {
        x: { field: "FIELD_X", type: "nominal", sort: null },
        y: { field: "FIELD_Y", type: "quantitative" },
        color: {
          condition: { test: "datum.FIELD_Y >= 0", value: "hsl(142, 71%, 45%)" },
          value: "hsl(0, 84%, 60%)",
        },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: "+,.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bar-layered",
    name: "Layered Bar Chart",
    category: "bar",
    description: "Overlapping semi-transparent bars for comparison.",
    tags: ["bar", "layered", "overlay", "comparison"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar", opacity: 0.7 },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "quantitative", stack: null },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },

  // =========================================================================
  // HISTOGRAMS & DENSITY
  // =========================================================================
  {
    id: "histogram",
    name: "Histogram",
    category: "histogram",
    description: "Distribution of a quantitative variable in bins.",
    tags: ["histogram", "distribution", "frequency"],
    encodings: [
      { ...X_SLOT, label: "Value", acceptedTypes: ["quantitative"] },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar" },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative", bin: true },
        y: { aggregate: "count", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "quantitative", bin: true },
          { aggregate: "count", type: "quantitative" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "density",
    name: "Density Plot",
    category: "histogram",
    description: "Smooth density estimate of a distribution.",
    tags: ["density", "distribution", "kde"],
    encodings: [
      { ...X_SLOT, label: "Value", acceptedTypes: ["quantitative"] },
      COLOR_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      transform: [{ density: "FIELD_X" }],
      mark: { type: "area", opacity: 0.6 },
      encoding: {
        x: { field: "value", type: "quantitative", title: "FIELD_X" },
        y: { field: "density", type: "quantitative" },
        tooltip: [
          { field: "value", type: "quantitative", format: ",.2f" },
          { field: "density", type: "quantitative", format: ".4f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "histogram-2d-heatmap",
    name: "2D Histogram Heatmap",
    category: "histogram",
    description: "Binned heatmap showing joint distribution of two variables.",
    tags: ["histogram", "heatmap", "2d", "distribution"],
    encodings: [
      { ...X_SLOT, label: "X Value", acceptedTypes: ["quantitative"] },
      { ...Y_SLOT, label: "Y Value" },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "rect" },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative", bin: { maxbins: 20 } },
        y: { field: "FIELD_Y", type: "quantitative", bin: { maxbins: 20 } },
        color: { aggregate: "count", type: "quantitative", scale: { scheme: "blues" } },
        tooltip: [{ aggregate: "count", type: "quantitative" }],
      },
    } as TopLevelSpec,
  },
  {
    id: "cumulative-frequency",
    name: "Cumulative Frequency",
    category: "histogram",
    description: "Cumulative distribution function of a variable.",
    tags: ["cumulative", "distribution", "cdf"],
    encodings: [
      { ...X_SLOT, label: "Value", acceptedTypes: ["quantitative"] },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      data: { values: [] },
      transform: [
        { sort: [{ field: "FIELD_X" }], window: [{ op: "count", as: "cumulative_count" }], frame: [null, 0] },
      ],
      mark: { type: "area", opacity: 0.6 },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "cumulative_count", type: "quantitative", title: "Cumulative Count" },
        tooltip: [
          { field: "FIELD_X", type: "quantitative" },
          { field: "cumulative_count", type: "quantitative" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "relative-frequency",
    name: "Relative Frequency Histogram",
    category: "histogram",
    description: "Histogram showing relative frequency (proportion) per bin.",
    tags: ["histogram", "relative", "proportion"],
    encodings: [
      { ...X_SLOT, label: "Value", acceptedTypes: ["quantitative"] },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      transform: [
        { bin: true, field: "FIELD_X", as: "bin_field" },
        { aggregate: [{ op: "count", as: "count" }], groupby: ["bin_field", "bin_field_end"] },
        { joinaggregate: [{ op: "sum", field: "count", as: "total" }] },
        { calculate: "datum.count / datum.total", as: "pct" },
      ],
      mark: { type: "bar" },
      encoding: {
        x: { field: "bin_field", type: "quantitative", bin: { binned: true }, title: "FIELD_X" },
        x2: { field: "bin_field_end" },
        y: { field: "pct", type: "quantitative", title: "Relative Frequency", axis: { format: ".0%" } },
        tooltip: [
          { field: "bin_field", type: "quantitative" },
          { field: "pct", type: "quantitative", format: ".1%" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "dot-plot",
    name: "Dot Plot",
    category: "histogram",
    description: "Strip of dots showing individual values along an axis.",
    tags: ["dot", "strip", "distribution"],
    encodings: [
      { ...X_SLOT, label: "Value", acceptedTypes: ["quantitative"] },
      { ...Y_SLOT, label: "Category", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_X" },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "circle", opacity: 0.7, size: 40 },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "FIELD_Y", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "quantitative" },
          { field: "FIELD_Y", type: "nominal" },
        ],
      },
    } as TopLevelSpec,
  },

  // =========================================================================
  // SCATTER & STRIP
  // =========================================================================
  {
    id: "scatter",
    name: "Scatter Plot",
    category: "scatter",
    description: "Points showing relationship between two quantitative variables.",
    tags: ["scatter", "correlation", "relationship"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      Y_SLOT,
      COLOR_SLOT,
      SIZE_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "circle", opacity: 0.7 },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "quantitative", format: ",.2f" },
          { field: "FIELD_Y", type: "quantitative", format: ",.2f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bubble",
    name: "Bubble Plot",
    category: "scatter",
    description: "Scatter plot with point size encoding a third variable.",
    tags: ["bubble", "scatter", "size"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      Y_SLOT,
      { ...SIZE_SLOT, required: true },
      COLOR_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "circle", opacity: 0.6 },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "FIELD_Y", type: "quantitative" },
        size: { field: "FIELD_SIZE", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "quantitative" },
          { field: "FIELD_Y", type: "quantitative" },
          { field: "FIELD_SIZE", type: "quantitative" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "strip",
    name: "Strip Plot",
    category: "scatter",
    description: "Tick marks showing distribution of values by category.",
    tags: ["strip", "tick", "distribution"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      { ...Y_SLOT, label: "Category", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_Y" },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "tick" },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "FIELD_Y", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "quantitative" },
          { field: "FIELD_Y", type: "nominal" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "scatter-colored",
    name: "Colored Scatter Plot",
    category: "scatter",
    description: "Scatter plot with points colored by category.",
    tags: ["scatter", "colored", "categorical"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "point", filled: true, opacity: 0.7 },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "FIELD_Y", type: "quantitative" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        shape: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "quantitative" },
          { field: "FIELD_Y", type: "quantitative" },
          { field: "FIELD_COLOR", type: "nominal" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "scatter-text",
    name: "Text Scatter Plot",
    category: "scatter",
    description: "Scatter plot with text labels instead of points.",
    tags: ["scatter", "text", "labels"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      Y_SLOT,
      { label: "Label", placeholder: "FIELD_TEXT", acceptedTypes: ["nominal"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "text", fontSize: 10 },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "FIELD_Y", type: "quantitative" },
        text: { field: "FIELD_TEXT", type: "nominal" },
        tooltip: [
          { field: "FIELD_TEXT", type: "nominal" },
          { field: "FIELD_X", type: "quantitative" },
          { field: "FIELD_Y", type: "quantitative" },
        ],
      },
    } as TopLevelSpec,
  },

  // =========================================================================
  // LINE CHARTS
  // =========================================================================
  {
    id: "line",
    name: "Line Chart",
    category: "line",
    description: "Simple line connecting data points in order.",
    tags: ["line", "trend", "time-series"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal", "quantitative"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "line", point: true, strokeWidth: 2 },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "line-multi",
    name: "Multi-Series Line Chart",
    category: "line",
    description: "Multiple lines colored by a category field.",
    tags: ["line", "multi-series", "comparison", "trend"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal", "quantitative"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "line", point: true, strokeWidth: 2 },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "line-step",
    name: "Step Chart",
    category: "line",
    description: "Line chart with step interpolation.",
    tags: ["line", "step", "discrete"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal", "quantitative"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "line", interpolate: "step-after", strokeWidth: 2 },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "line-slope",
    name: "Slope Graph",
    category: "line",
    description: "Lines connecting two time points to show change.",
    tags: ["slope", "comparison", "change"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "line", point: { filled: true, size: 60 } },
      encoding: {
        x: { field: "FIELD_X", type: "ordinal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_X", type: "ordinal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "line-bump",
    name: "Bump Chart",
    category: "line",
    description: "Rank changes over time shown as crossing lines.",
    tags: ["bump", "rank", "change"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "line", point: { filled: true, size: 60 }, strokeWidth: 2 },
      encoding: {
        x: { field: "FIELD_X", type: "ordinal" },
        y: { field: "FIELD_Y", type: "quantitative", sort: "descending" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_X", type: "ordinal" },
          { field: "FIELD_Y", type: "quantitative" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "line-trail",
    name: "Trail (Varying Width Line)",
    category: "line",
    description: "Line with varying width encoding a third variable.",
    tags: ["trail", "line", "size"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal", "quantitative"] },
      Y_SLOT,
      { ...SIZE_SLOT, required: true },
      COLOR_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "trail" },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        size: { field: "FIELD_SIZE", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "quantitative" },
          { field: "FIELD_SIZE", type: "quantitative" },
        ],
      },
    } as TopLevelSpec,
  },

  // =========================================================================
  // AREA CHARTS
  // =========================================================================
  {
    id: "area",
    name: "Area Chart",
    category: "area",
    description: "Filled area under a line showing magnitude over time.",
    tags: ["area", "trend", "time-series"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal", "quantitative"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "area", opacity: 0.6, line: true },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "area-stacked",
    name: "Stacked Area Chart",
    category: "area",
    description: "Multiple areas stacked to show composition over time.",
    tags: ["area", "stacked", "composition", "time-series"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "area" },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative", stack: "zero" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "area-normalized",
    name: "Normalized Stacked Area",
    category: "area",
    description: "100% stacked area showing proportional composition over time.",
    tags: ["area", "stacked", "normalized", "percentage"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "area" },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative", stack: "normalize" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "area-streamgraph",
    name: "Streamgraph",
    category: "area",
    description: "Stacked area centered around a baseline for organic flow.",
    tags: ["streamgraph", "area", "flow"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      Y_SLOT,
      { ...COLOR_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "area" },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative", stack: "center" },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "area-gradient",
    name: "Area Chart with Gradient",
    category: "area",
    description: "Area chart with a gradient fill from top to bottom.",
    tags: ["area", "gradient", "trend"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal", "quantitative"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: {
        type: "area",
        line: { color: "hsl(221, 83%, 53%)" },
        color: {
          x1: 1, y1: 1, x2: 1, y2: 0,
          gradient: "linear",
          stops: [
            { offset: 0, color: "white" },
            { offset: 1, color: "hsl(221, 83%, 53%)" },
          ],
        },
      },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },

  // =========================================================================
  // TABLE PLOTS
  // =========================================================================
  {
    id: "heatmap",
    name: "Heatmap",
    category: "table",
    description: "Color-coded matrix showing values across two categories.",
    tags: ["heatmap", "matrix", "color"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      { ...Y_SLOT, label: "Y Category", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_Y" },
      { label: "Value", placeholder: "FIELD_VALUE", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "rect" },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "nominal" },
        color: { field: "FIELD_VALUE", type: "quantitative", scale: { scheme: "blues" } },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "nominal" },
          { field: "FIELD_VALUE", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "heatmap-labeled",
    name: "Heatmap with Labels",
    category: "table",
    description: "Heatmap with value labels in each cell.",
    tags: ["heatmap", "labels", "annotated"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      { ...Y_SLOT, label: "Y Category", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_Y" },
      { label: "Value", placeholder: "FIELD_VALUE", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "rect" },
          encoding: {
            color: { field: "FIELD_VALUE", type: "quantitative", scale: { scheme: "blues" } },
          },
        },
        {
          mark: { type: "text", fontSize: 10 },
          encoding: {
            text: { field: "FIELD_VALUE", type: "quantitative", format: ",.0f" },
            color: {
              condition: { test: "datum.FIELD_VALUE > 50", value: "white" },
              value: "black",
            },
          },
        },
      ],
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "nominal" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "nominal" },
          { field: "FIELD_VALUE", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "bubble-table",
    name: "Bubble Table (Punch Card)",
    category: "table",
    description: "Matrix of circles sized by value, like a GitHub punch card.",
    tags: ["bubble", "table", "punch-card", "matrix"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      { ...Y_SLOT, label: "Y Category", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_Y" },
      { label: "Size Value", placeholder: "FIELD_SIZE", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "circle" },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "nominal" },
        size: { field: "FIELD_SIZE", type: "quantitative" },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "nominal" },
          { field: "FIELD_SIZE", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "lasagna",
    name: "Lasagna Plot",
    category: "table",
    description: "Dense time-series heatmap (time on X, category on Y).",
    tags: ["lasagna", "heatmap", "time-series", "dense"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      { ...Y_SLOT, label: "Category", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_Y" },
      { label: "Value", placeholder: "FIELD_VALUE", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "rect" },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "nominal" },
        color: { field: "FIELD_VALUE", type: "quantitative", scale: { scheme: "viridis" } },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "nominal" },
          { field: "FIELD_VALUE", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },

  // =========================================================================
  // CIRCULAR PLOTS
  // =========================================================================
  {
    id: "pie",
    name: "Pie Chart",
    category: "circular",
    description: "Classic pie chart showing proportions of a whole.",
    tags: ["pie", "proportion", "composition"],
    encodings: [
      { ...THETA_SLOT },
      { ...COLOR_SLOT, label: "Category", required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "arc" },
      encoding: {
        theta: { field: "FIELD_THETA", type: "quantitative", stack: true },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_THETA", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "donut",
    name: "Donut Chart",
    category: "circular",
    description: "Pie chart with a hole in the center.",
    tags: ["donut", "pie", "proportion"],
    encodings: [
      { ...THETA_SLOT },
      { ...COLOR_SLOT, label: "Category", required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "arc", innerRadius: 60 },
      encoding: {
        theta: { field: "FIELD_THETA", type: "quantitative", stack: true },
        color: { field: "FIELD_COLOR", type: "nominal" },
        tooltip: [
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_THETA", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "radial",
    name: "Radial Bar Chart",
    category: "circular",
    description: "Bars arranged radially around a center point.",
    tags: ["radial", "bar", "circular"],
    encodings: [
      { ...THETA_SLOT },
      { ...COLOR_SLOT, label: "Category", required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "arc", innerRadius: 30, stroke: "#fff" },
        },
        {
          mark: { type: "text", radiusOffset: 15, fontSize: 10 },
          encoding: {
            text: { field: "FIELD_THETA", type: "quantitative", format: ",.0f" },
          },
        },
      ],
      encoding: {
        theta: { field: "FIELD_THETA", type: "quantitative", stack: true },
        radius: { field: "FIELD_THETA", type: "quantitative", scale: { type: "sqrt", zero: true, rangeMin: 30 } },
        color: { field: "FIELD_COLOR", type: "nominal", legend: null },
        tooltip: [
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_THETA", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "pie-labeled",
    name: "Pie Chart with Labels",
    category: "circular",
    description: "Pie chart with category labels around the outside.",
    tags: ["pie", "labels", "annotated"],
    encodings: [
      { ...THETA_SLOT },
      { ...COLOR_SLOT, label: "Category", required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "arc", outerRadius: 100 },
        },
        {
          mark: { type: "text", radius: 120, fontSize: 11 },
          encoding: {
            text: { field: "FIELD_COLOR", type: "nominal" },
          },
        },
      ],
      encoding: {
        theta: { field: "FIELD_THETA", type: "quantitative", stack: true },
        color: { field: "FIELD_COLOR", type: "nominal", legend: null },
        tooltip: [
          { field: "FIELD_COLOR", type: "nominal" },
          { field: "FIELD_THETA", type: "quantitative", format: ",.0f" },
        ],
      },
    } as TopLevelSpec,
  },

  // =========================================================================
  // STATISTICAL
  // =========================================================================
  {
    id: "boxplot",
    name: "Box Plot",
    category: "statistical",
    description: "Shows median, quartiles, and outliers for distributions.",
    tags: ["boxplot", "distribution", "quartile", "outlier"],
    encodings: [
      { ...X_SLOT, label: "Category", acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "boxplot", extent: 1.5 },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        tooltip: [{ field: "FIELD_X", type: "nominal" }],
      },
    } as TopLevelSpec,
  },
  {
    id: "errorbar",
    name: "Error Bars",
    category: "statistical",
    description: "Points with error bars showing confidence intervals.",
    tags: ["error", "confidence", "interval"],
    encodings: [
      { ...X_SLOT, label: "Category", acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "errorbar", extent: "ci" },
          encoding: {
            x: { field: "FIELD_X", type: "nominal" },
            y: { field: "FIELD_Y", type: "quantitative" },
          },
        },
        {
          mark: { type: "point", filled: true, size: 40 },
          encoding: {
            x: { field: "FIELD_X", type: "nominal" },
            y: { field: "FIELD_Y", type: "quantitative", aggregate: "mean" },
          },
        },
      ],
    } as TopLevelSpec,
  },
  {
    id: "errorband",
    name: "Error Band",
    category: "statistical",
    description: "Line chart with a confidence interval band.",
    tags: ["error", "band", "confidence", "line"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal", "quantitative"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "errorband", extent: "ci" },
          encoding: {
            x: { field: "FIELD_X", type: "temporal" },
            y: { field: "FIELD_Y", type: "quantitative" },
          },
        },
        {
          mark: { type: "line" },
          encoding: {
            x: { field: "FIELD_X", type: "temporal" },
            y: { field: "FIELD_Y", type: "quantitative", aggregate: "mean" },
          },
        },
      ],
    } as TopLevelSpec,
  },
  {
    id: "regression",
    name: "Linear Regression",
    category: "statistical",
    description: "Scatter plot with a fitted regression line.",
    tags: ["regression", "linear", "trend", "fit"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "circle", opacity: 0.5 },
          encoding: {
            x: { field: "FIELD_X", type: "quantitative" },
            y: { field: "FIELD_Y", type: "quantitative" },
          },
        },
        {
          mark: { type: "line", color: "hsl(0, 84%, 60%)", strokeWidth: 2 },
          transform: [{ regression: "FIELD_Y", on: "FIELD_X" }],
          encoding: {
            x: { field: "FIELD_X", type: "quantitative" },
            y: { field: "FIELD_Y", type: "quantitative" },
          },
        },
      ],
    } as TopLevelSpec,
  },
  {
    id: "loess",
    name: "Loess Regression",
    category: "statistical",
    description: "Scatter plot with a smooth loess curve.",
    tags: ["loess", "smooth", "regression", "curve"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "circle", opacity: 0.5 },
          encoding: {
            x: { field: "FIELD_X", type: "quantitative" },
            y: { field: "FIELD_Y", type: "quantitative" },
          },
        },
        {
          mark: { type: "line", color: "hsl(0, 84%, 60%)", strokeWidth: 2 },
          transform: [{ loess: "FIELD_Y", on: "FIELD_X" }],
          encoding: {
            x: { field: "FIELD_X", type: "quantitative" },
            y: { field: "FIELD_Y", type: "quantitative" },
          },
        },
      ],
    } as TopLevelSpec,
  },

  // =========================================================================
  // ADVANCED
  // =========================================================================
  {
    id: "waterfall",
    name: "Waterfall Chart",
    category: "advanced",
    description: "Shows cumulative effect of sequential positive/negative values.",
    tags: ["waterfall", "cumulative", "finance"],
    encodings: [
      { ...X_SLOT, label: "Category", acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      transform: [
        { window: [{ op: "sum", field: "FIELD_Y", as: "sum" }] },
        { calculate: "datum.sum - datum.FIELD_Y", as: "previous_sum" },
        { calculate: "datum.FIELD_Y >= 0 ? 'positive' : 'negative'", as: "direction" },
      ],
      mark: { type: "bar" },
      encoding: {
        x: { field: "FIELD_X", type: "nominal", sort: null },
        y: { field: "previous_sum", type: "quantitative", title: "Amount" },
        y2: { field: "sum" },
        color: {
          field: "direction",
          type: "nominal",
          scale: { domain: ["positive", "negative"], range: ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)"] },
          legend: null,
        },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: "+,.0f", title: "Change" },
          { field: "sum", type: "quantitative", format: ",.0f", title: "Running Total" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "candlestick",
    name: "Candlestick Chart",
    category: "advanced",
    description: "Financial chart showing open, high, low, close values.",
    tags: ["candlestick", "finance", "ohlc"],
    encodings: [
      { ...X_SLOT, label: "Date", acceptedTypes: ["temporal"] },
      { label: "Open", placeholder: "FIELD_OPEN", acceptedTypes: ["quantitative"], required: true },
      { label: "High", placeholder: "FIELD_HIGH", acceptedTypes: ["quantitative"], required: true },
      { label: "Low", placeholder: "FIELD_LOW", acceptedTypes: ["quantitative"], required: true },
      { label: "Close", placeholder: "FIELD_CLOSE", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      transform: [
        { calculate: "datum.FIELD_OPEN < datum.FIELD_CLOSE ? 'up' : 'down'", as: "direction" },
      ],
      layer: [
        {
          mark: { type: "rule" },
          encoding: {
            x: { field: "FIELD_X", type: "temporal" },
            y: { field: "FIELD_LOW", type: "quantitative", title: "Price" },
            y2: { field: "FIELD_HIGH" },
            color: {
              field: "direction",
              type: "nominal",
              scale: { domain: ["up", "down"], range: ["hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)"] },
              legend: null,
            },
          },
        },
        {
          mark: { type: "bar", width: 6 },
          encoding: {
            x: { field: "FIELD_X", type: "temporal" },
            y: { field: "FIELD_OPEN", type: "quantitative" },
            y2: { field: "FIELD_CLOSE" },
            color: { field: "direction", type: "nominal" },
          },
        },
      ],
    } as TopLevelSpec,
  },
  {
    id: "dual-axis",
    name: "Dual-Axis Chart",
    category: "advanced",
    description: "Two Y-axes showing different scales for comparison.",
    tags: ["dual-axis", "comparison", "multi-scale"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      { ...Y_SLOT, label: "Left Y Axis" },
      { label: "Right Y Axis", placeholder: "FIELD_Y2", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "bar", opacity: 0.6 },
          encoding: {
            x: { field: "FIELD_X", type: "temporal" },
            y: { field: "FIELD_Y", type: "quantitative", axis: { title: "FIELD_Y" } },
          },
        },
        {
          mark: { type: "line", color: "hsl(0, 84%, 60%)", strokeWidth: 2 },
          encoding: {
            x: { field: "FIELD_X", type: "temporal" },
            y: { field: "FIELD_Y2", type: "quantitative", axis: { title: "FIELD_Y2" } },
          },
        },
      ],
      resolve: { scale: { y: "independent" } },
    } as TopLevelSpec,
  },
  {
    id: "bullet",
    name: "Bullet Chart",
    category: "advanced",
    description: "Compact bar showing actual vs target with ranges.",
    tags: ["bullet", "target", "kpi", "gauge"],
    encodings: [
      { ...X_SLOT, label: "Category", acceptedTypes: ["nominal"] },
      { ...Y_SLOT, label: "Actual Value" },
      { label: "Target", placeholder: "FIELD_TARGET", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "bar", color: "#ddd" },
          encoding: {
            x: { field: "FIELD_TARGET", type: "quantitative", title: "Value" },
            y: { field: "FIELD_X", type: "nominal" },
          },
        },
        {
          mark: { type: "bar", width: 14 },
          encoding: {
            x: { field: "FIELD_Y", type: "quantitative" },
            y: { field: "FIELD_X", type: "nominal" },
          },
        },
        {
          mark: { type: "tick", color: "black", thickness: 2, size: 20 },
          encoding: {
            x: { field: "FIELD_TARGET", type: "quantitative" },
            y: { field: "FIELD_X", type: "nominal" },
          },
        },
      ],
    } as TopLevelSpec,
  },
  {
    id: "ranged-dot",
    name: "Ranged Dot Plot",
    category: "advanced",
    description: "Dots connected by lines showing ranges per category.",
    tags: ["ranged", "dot", "range", "comparison"],
    encodings: [
      { ...Y_SLOT, label: "Category", acceptedTypes: ["nominal", "ordinal"], placeholder: "FIELD_Y" },
      { label: "Min Value", placeholder: "FIELD_MIN", acceptedTypes: ["quantitative"], required: true },
      { label: "Max Value", placeholder: "FIELD_MAX", acceptedTypes: ["quantitative"], required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      layer: [
        {
          mark: { type: "rule" },
          encoding: {
            y: { field: "FIELD_Y", type: "nominal" },
            x: { field: "FIELD_MIN", type: "quantitative", title: "Value" },
            x2: { field: "FIELD_MAX" },
          },
        },
        {
          mark: { type: "circle", size: 60, color: "hsl(221, 83%, 53%)" },
          encoding: {
            y: { field: "FIELD_Y", type: "nominal" },
            x: { field: "FIELD_MIN", type: "quantitative" },
          },
        },
        {
          mark: { type: "circle", size: 60, color: "hsl(0, 84%, 60%)" },
          encoding: {
            y: { field: "FIELD_Y", type: "nominal" },
            x: { field: "FIELD_MAX", type: "quantitative" },
          },
        },
      ],
    } as TopLevelSpec,
  },

  // =========================================================================
  // MULTI-VIEW
  // =========================================================================
  {
    id: "trellis-bar",
    name: "Trellis Bar Chart",
    category: "multiview",
    description: "Small multiple bar charts faceted by a category.",
    tags: ["trellis", "facet", "small-multiples", "bar"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["nominal", "ordinal"] },
      Y_SLOT,
      { ...FACET_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "bar" },
      encoding: {
        x: { field: "FIELD_X", type: "nominal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        facet: { field: "FIELD_FACET", type: "nominal", columns: 3 },
        tooltip: [
          { field: "FIELD_X", type: "nominal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
          { field: "FIELD_FACET", type: "nominal" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "trellis-line",
    name: "Trellis Line Chart",
    category: "multiview",
    description: "Small multiple line charts faceted by a category.",
    tags: ["trellis", "facet", "small-multiples", "line"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      Y_SLOT,
      { ...FACET_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "line", point: true },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        facet: { field: "FIELD_FACET", type: "nominal", columns: 3 },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
          { field: "FIELD_FACET", type: "nominal" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "trellis-scatter",
    name: "Trellis Scatter Plot",
    category: "multiview",
    description: "Small multiple scatter plots faceted by a category.",
    tags: ["trellis", "facet", "small-multiples", "scatter"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["quantitative"] },
      Y_SLOT,
      { ...FACET_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "circle", opacity: 0.7 },
      encoding: {
        x: { field: "FIELD_X", type: "quantitative" },
        y: { field: "FIELD_Y", type: "quantitative" },
        facet: { field: "FIELD_FACET", type: "nominal", columns: 3 },
        tooltip: [
          { field: "FIELD_X", type: "quantitative" },
          { field: "FIELD_Y", type: "quantitative" },
          { field: "FIELD_FACET", type: "nominal" },
        ],
      },
    } as TopLevelSpec,
  },
  {
    id: "trellis-area",
    name: "Trellis Area Chart",
    category: "multiview",
    description: "Small multiple area charts faceted by a category.",
    tags: ["trellis", "facet", "small-multiples", "area"],
    encodings: [
      { ...X_SLOT, acceptedTypes: ["temporal", "ordinal"] },
      Y_SLOT,
      { ...FACET_SLOT, required: true },
    ],
    spec: {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      mark: { type: "area", opacity: 0.6, line: true },
      encoding: {
        x: { field: "FIELD_X", type: "temporal" },
        y: { field: "FIELD_Y", type: "quantitative" },
        facet: { field: "FIELD_FACET", type: "nominal", columns: 3 },
        tooltip: [
          { field: "FIELD_X", type: "temporal" },
          { field: "FIELD_Y", type: "quantitative", format: ",.0f" },
          { field: "FIELD_FACET", type: "nominal" },
        ],
      },
    } as TopLevelSpec,
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { CATEGORIES, CHART_TYPES };
export type { ChartCategory, ChartTypeDefinition, CategoryMeta, EncodingSlot, FieldType };

/**
 * Replace placeholder field names in a spec with actual column names.
 *
 * Performs a deep string replacement on the JSON-serialized spec.
 */
function replaceFields(
  spec: TopLevelSpec,
  mappings: Record<string, string>
): TopLevelSpec {
  let json = JSON.stringify(spec);
  for (const [placeholder, columnName] of Object.entries(mappings)) {
    // Replace both as JSON string values and in expressions
    json = json.replaceAll(placeholder, columnName);
  }
  return JSON.parse(json) as TopLevelSpec;
}

/**
 * Build a ready-to-render Vega-Lite spec from a chart type and column mappings.
 */
function buildSpec(
  chartType: ChartTypeDefinition,
  mappings: Record<string, string>,
  data: Record<string, unknown>[],
  options?: { title?: string }
): TopLevelSpec {
  const spec = replaceFields(chartType.spec, mappings);
  return {
    ...spec,
    ...(options?.title ? { title: options.title } : {}),
    data: { values: data },
  } as TopLevelSpec;
}

export { buildSpec, replaceFields };
