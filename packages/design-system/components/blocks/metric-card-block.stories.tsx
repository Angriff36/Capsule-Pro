import type { Meta, StoryObj } from "@storybook/react";
import { MetricCardBlock } from "./metric-card-block";

const meta = {
  title: "Blocks/MetricCardBlock",
  component: MetricCardBlock,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MetricCardBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Basic metric card with description, value, and detail text
 */
export const BasicMetric: Story = {
  args: {
    description: "Profit margin",
    value: "21.4%",
    detail: "Events with real-time budgets aligned",
  },
};

/**
 * Metric card with upward trend indicator
 */
export const WithUpwardTrend: Story = {
  args: {
    description: "Weekly revenue",
    value: "$142,000",
    detail: "+8% vs. last week",
    trend: "up",
  },
};

/**
 * Metric card with downward trend indicator
 */
export const WithDownwardTrend: Story = {
  args: {
    description: "Waste reduction",
    value: "-12%",
    detail: "Down vs. historical baseline",
    trend: "down",
  },
};

/**
 * Metric card with neutral trend indicator
 */
export const WithNeutralTrend: Story = {
  args: {
    description: "Labor efficiency",
    value: "92%",
    detail: "No change from last week",
    trend: "neutral",
  },
};

/**
 * Metric card with colored value
 */
export const WithColoredValue: Story = {
  args: {
    description: "Gross Margin",
    value: "$8,420",
    valueColor: "text-green-600",
    detail: "+2.4% vs budget",
  },
};

/**
 * Metric card with negative colored value
 */
export const WithNegativeColoredValue: Story = {
  args: {
    description: "Cost Variance",
    value: "-$1,240",
    valueColor: "text-red-600",
    detail: "Over budget on food costs",
  },
};

/**
 * Metric card with multi-line detail content
 */
export const WithMultiLineDetail: Story = {
  args: {
    description: "Total Costs",
    value: "$12,500",
    detail: (
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Food: $4,200</div>
        <div>Labor: $6,800</div>
        <div>Overhead: $1,500</div>
      </div>
    ),
  },
};

/**
 * Metric card with larger value size
 */
export const WithLargeValue: Story = {
  args: {
    description: "Total Revenue",
    value: "$1,234,567",
    valueSize: "text-3xl",
    detail: "All time high",
  },
};

/**
 * Metric card with smaller value size
 */
export const WithSmallValue: Story = {
  args: {
    description: "Success Rate",
    value: "98%",
    valueSize: "text-xl",
    detail: "Events delivered successfully",
  },
};

/**
 * Dashboard grid showing multiple metric cards together
 */
export const DashboardGrid: Story = {
  render: () => (
    <div className="w-[800px]">
      <div className="mb-4 text-sm font-medium text-muted-foreground">
        Performance Overview
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCardBlock
          description="Weekly revenue"
          value="$142,000"
          detail="+8% vs. last week"
          trend="up"
        />
        <MetricCardBlock
          description="Labor efficiency"
          value="92%"
          detail="2% rebound after labor reforecast"
          trend="up"
        />
        <MetricCardBlock
          description="Waste reduction"
          value="-12%"
          detail="Down vs. historical baseline"
          trend="down"
        />
      </div>
    </div>
  ),
};

/**
 * Focus metrics grid without trend indicators
 */
export const FocusMetricsGrid: Story = {
  render: () => (
    <div className="w-[800px]">
      <div className="mb-4 text-sm font-medium text-muted-foreground">
        Focus Metrics
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCardBlock
          description="Profit margin"
          value="21.4%"
          detail="Events with real-time budgets aligned"
        />
        <MetricCardBlock
          description="Service completion"
          value="98%"
          detail="Events on track this week"
        />
        <MetricCardBlock
          description="Client satisfaction"
          value="4.8/5"
          detail="Surveyed after delivery"
        />
      </div>
    </div>
  ),
};

/**
 * Cost analysis metrics with colored values and multi-line details
 */
export const CostAnalysisGrid: Story = {
  render: () => (
    <div className="w-[800px]">
      <div className="mb-4 text-sm font-medium text-muted-foreground">
        Cost Analysis
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardBlock
          description="Budgeted Revenue"
          value="$45,000"
        />
        <MetricCardBlock
          description="Actual Revenue"
          value="$47,850"
          valueColor="text-green-600"
          detail="+6.3% over budget"
        />
        <MetricCardBlock
          description="Total Costs"
          value="$35,420"
          detail={
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>Food: $14,200</div>
              <div>Labor: $18,400</div>
              <div>Overhead: $2,820</div>
            </div>
          }
        />
        <MetricCardBlock
          description="Gross Margin"
          value="$12,430"
          valueColor="text-green-600"
          detail="26.0% (+3.2% vs budget)"
        />
      </div>
    </div>
  ),
};
