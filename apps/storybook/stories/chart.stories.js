Object.defineProperty(exports, "__esModule", { value: true });
exports.DoughnutChart =
  exports.MultiLineChart =
  exports.StackedBarChart =
  exports.StackedAreaChart =
    void 0;
const chart_1 = require("@repo/design-system/components/ui/chart");
const react_1 = require("react");
const recharts_1 = require("recharts");
const multiSeriesData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
];
const multiSeriesConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
};
const singleSeriesData = [
  { browser: "chrome", visitors: 275, fill: "var(--color-chrome)" },
  { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
  { browser: "other", visitors: 190, fill: "var(--color-other)" },
];
const singleSeriesConfig = {
  visitors: {
    label: "Visitors",
  },
  chrome: {
    label: "Chrome",
    color: "hsl(var(--chart-1))",
  },
  safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-5))",
  },
};
/**
 * Beautiful charts. Built using Recharts. Copy and paste into your apps.
 */
const meta = {
  title: "ui/Chart",
  component: chart_1.ChartContainer,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    children: <div />,
  },
};
exports.default = meta;
/**
 * Combine multiple Area components to create a stacked area chart.
 */
exports.StackedAreaChart = {
  args: {
    config: multiSeriesConfig,
  },
  render: (args) => (
    <chart_1.ChartContainer {...args}>
      <recharts_1.AreaChart
        accessibilityLayer
        data={multiSeriesData}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <recharts_1.CartesianGrid vertical={false} />
        <recharts_1.XAxis
          axisLine={false}
          dataKey="month"
          tickFormatter={(value) => value.slice(0, 3)}
          tickLine={false}
          tickMargin={8}
        />
        <chart_1.ChartTooltip
          content={<chart_1.ChartTooltipContent indicator="dot" />}
          cursor={false}
        />
        <recharts_1.Area
          dataKey="mobile"
          fill="var(--color-mobile)"
          fillOpacity={0.4}
          stackId="a"
          stroke="var(--color-mobile)"
          type="natural"
        />
        <recharts_1.Area
          dataKey="desktop"
          fill="var(--color-desktop)"
          fillOpacity={0.4}
          stackId="a"
          stroke="var(--color-desktop)"
          type="natural"
        />
      </recharts_1.AreaChart>
    </chart_1.ChartContainer>
  ),
};
/**
 * Combine multiple Bar components to create a stacked bar chart.
 */
exports.StackedBarChart = {
  args: {
    config: multiSeriesConfig,
  },
  render: (args) => (
    <chart_1.ChartContainer {...args}>
      <recharts_1.BarChart accessibilityLayer data={multiSeriesData}>
        <recharts_1.CartesianGrid vertical={false} />
        <recharts_1.XAxis
          axisLine={false}
          dataKey="month"
          tickFormatter={(value) => value.slice(0, 3)}
          tickLine={false}
          tickMargin={10}
        />
        <chart_1.ChartTooltip
          content={<chart_1.ChartTooltipContent indicator="dashed" />}
          cursor={false}
        />
        <recharts_1.Bar
          dataKey="desktop"
          fill="var(--color-desktop)"
          radius={4}
        />
        <recharts_1.Bar
          dataKey="mobile"
          fill="var(--color-mobile)"
          radius={4}
        />
      </recharts_1.BarChart>
    </chart_1.ChartContainer>
  ),
};
/**
 * Combine multiple Line components to create a single line chart.
 */
exports.MultiLineChart = {
  args: {
    config: multiSeriesConfig,
  },
  render: (args) => (
    <chart_1.ChartContainer {...args}>
      <recharts_1.LineChart
        accessibilityLayer
        data={multiSeriesData}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <recharts_1.CartesianGrid vertical={false} />
        <recharts_1.XAxis
          axisLine={false}
          dataKey="month"
          tickFormatter={(value) => value.slice(0, 3)}
          tickLine={false}
          tickMargin={8}
        />
        <chart_1.ChartTooltip
          content={<chart_1.ChartTooltipContent hideLabel />}
          cursor={false}
        />
        <recharts_1.Line
          dataKey="desktop"
          dot={false}
          stroke="var(--color-desktop)"
          strokeWidth={2}
          type="natural"
        />
        <recharts_1.Line
          dataKey="mobile"
          dot={false}
          stroke="var(--color-mobile)"
          strokeWidth={2}
          type="natural"
        />
      </recharts_1.LineChart>
    </chart_1.ChartContainer>
  ),
};
/**
 * Combine Pie and Label components to create a doughnut chart.
 */
exports.DoughnutChart = {
  args: {
    config: singleSeriesConfig,
  },
  render: (args) => {
    const totalVisitors = (0, react_1.useMemo)(
      () => singleSeriesData.reduce((acc, curr) => acc + curr.visitors, 0),
      []
    );
    return (
      <chart_1.ChartContainer {...args}>
        <recharts_1.PieChart>
          <chart_1.ChartTooltip
            content={<chart_1.ChartTooltipContent hideLabel />}
            cursor={false}
          />
          <recharts_1.Pie
            data={singleSeriesData}
            dataKey="visitors"
            innerRadius={48}
            nameKey="browser"
            strokeWidth={5}
          >
            <recharts_1.Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      dominantBaseline="middle"
                      textAnchor="middle"
                      x={viewBox.cx}
                      y={viewBox.cy}
                    >
                      <tspan
                        className="fill-foreground font-bold text-3xl"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        {totalVisitors.toLocaleString()}
                      </tspan>
                      <tspan
                        className="fill-muted-foreground"
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                      >
                        Visitors
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </recharts_1.Pie>
        </recharts_1.PieChart>
      </chart_1.ChartContainer>
    );
  },
};
