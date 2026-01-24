export declare class InventoryForecastApiClient {
  private readonly baseUrl;
  constructor(baseUrl?: string);
  getForecast(
    sku: string,
    fromDate: string,
    toDate: string
  ): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=inventoryApiClient.d.ts.map
