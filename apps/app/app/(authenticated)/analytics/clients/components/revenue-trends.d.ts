type RevenueTrendsProps = {
  data: Array<{
    month: string;
    revenue: number;
    orders: number;
    clients: number;
  }>;
  className?: string;
};
export declare function RevenueTrends({
  data,
  className,
}: RevenueTrendsProps): import("react").JSX.Element;
//# sourceMappingURL=revenue-trends.d.ts.map
