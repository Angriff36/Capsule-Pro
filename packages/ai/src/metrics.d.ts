import { z } from "zod";
import type { Metrics } from "./types.js";
export declare const MetricsExportSchema: z.ZodObject<
  {
    format: z.ZodEnum<{
      json: "json";
      prometheus: "prometheus";
      datadog: "datadog";
      webhook: "webhook";
    }>;
    destination: z.ZodString;
  },
  z.core.$strip
>;
export type MetricsExportConfig = z.infer<typeof MetricsExportSchema>;
export interface MetricsCollectorOptions {
  maxEntries?: number;
  exportConfig?: MetricsExportConfig;
}
export declare class MetricsCollector {
  private readonly entries;
  private readonly maxEntries;
  private readonly exportConfig?;
  private exportInterval?;
  constructor(options?: MetricsCollectorOptions);
  record(metrics: Metrics): void;
  getByAgentId(agentId: string): Metrics[];
  getLatestByAgentId(agentId: string): Metrics | undefined;
  getAggregateByAgentId(agentId: string): AggregateMetrics;
  getAll(): Metrics[];
  clear(): void;
  export(): Promise<string>;
  private startExportInterval;
  private exportToWebhook;
  private exportToPrometheus;
  private exportToDatadog;
  destroy(): void;
}
export interface AggregateMetrics {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  totalTokens: number;
  totalToolCalls: number;
  totalRetries: number;
  totalErrors: number;
}
//# sourceMappingURL=metrics.d.ts.map
