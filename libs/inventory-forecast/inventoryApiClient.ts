// Placeholder client for forecasting service
export class InventoryForecastApiClient {
  constructor(readonly _baseUrl: string = "http://localhost:8000") {}

  async getForecast(
    _sku: string,
    _fromDate: string,
    _toDate: string
  ): Promise<Record<string, unknown>> {
    // TODO: Implement API call
    await Promise.resolve(); // Placeholder await
    return {};
  }
}
