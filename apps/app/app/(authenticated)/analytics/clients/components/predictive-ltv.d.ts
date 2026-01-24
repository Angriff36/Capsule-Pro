type PredictiveLTVProps = {
  data: {
    averagePredictedLTV: number;
    confidence: number;
    clientSegments: Array<{
      segment: string;
      count: number;
      avgHistoricalLTV: number;
      avgPredictedLTV: number;
      growthRate: number;
    }>;
  };
  className?: string;
};
export declare function PredictiveLTV({
  data,
  className,
}: PredictiveLTVProps): import("react").JSX.Element;
//# sourceMappingURL=predictive-ltv.d.ts.map
