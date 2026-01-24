export type ForecastInput = {
  sku: string;
  date: string;
  historicalUsage: number;
  events: Array<{
    date: string;
    type: string;
    impact: number;
  }>;
  promotions: Array<{
    date: string;
    promoId: string;
    impact: number;
  }>;
  seasonalityFactors?: Record<string, unknown>;
};
export type ForecastPoint = {
  date: string;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
};
export type ReorderSuggestion = {
  sku: string;
  recommendedOrderQty: number;
  reorderPoint: number;
  safetyStock: number;
  leadTimeDays: number;
  justification: string;
};
//# sourceMappingURL=forecastTypes.d.ts.map
