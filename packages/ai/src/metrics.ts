import { z } from "zod";
import type { Metrics } from "./types.js";

export const MetricsExportSchema = z.object({
  format: z.enum(["json", "prometheus", "datadog", "webhook"]),
  destination: z.string(),
});

export type MetricsExportConfig = z.infer<typeof MetricsExportSchema>;

export type MetricsCollectorOptions = {
  maxEntries?: number;
  exportConfig?: MetricsExportConfig;
};

export class MetricsCollector {
  private readonly entries: Metrics[] = [];
  private readonly maxEntries: number;
  private readonly exportConfig?: MetricsExportConfig;
  private exportInterval?: ReturnType<typeof setInterval>;
  private readonly exportStrategies: Record<
    MetricsExportConfig["format"],
    () => Promise<string> | string
  > = {
    json: () => JSON.stringify(this.entries, null, 2),
    prometheus: () => this.exportToPrometheus(),
    datadog: () => this.exportToDatadog(),
    webhook: () => this.exportToWebhook(),
  };

  constructor(options: MetricsCollectorOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.exportConfig = options.exportConfig;

    if (this.exportConfig) {
      this.startExportInterval();
    }
  }

  record(metrics: Metrics): void {
    this.entries.push(metrics);

    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  getByAgentId(agentId: string): Metrics[] {
    return this.entries.filter((m) => m.agentId === agentId);
  }

  getLatestByAgentId(agentId: string): Metrics | undefined {
    const agentMetrics = this.getByAgentId(agentId);
    return agentMetrics.at(-1);
  }

  getAggregateByAgentId(agentId: string): AggregateMetrics {
    const agentMetrics = this.getByAgentId(agentId);

    if (agentMetrics.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        totalTokens: 0,
        totalToolCalls: 0,
        totalRetries: 0,
        totalErrors: 0,
      };
    }

    const successfulExecutions = agentMetrics.filter(
      (m) => m.status === "success"
    );
    const totalDuration = agentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalTokens = agentMetrics.reduce(
      (sum, m) => sum + m.tokens.total,
      0
    );
    const totalToolCalls = agentMetrics.reduce(
      (sum, m) => sum + m.toolCalls,
      0
    );
    const totalRetries = agentMetrics.reduce((sum, m) => sum + m.retries, 0);
    const totalErrors = agentMetrics.reduce((sum, m) => sum + m.errors, 0);

    return {
      totalExecutions: agentMetrics.length,
      successRate: successfulExecutions.length / agentMetrics.length,
      averageDuration: totalDuration / agentMetrics.length,
      totalTokens,
      totalToolCalls,
      totalRetries,
      totalErrors,
    };
  }

  getAll(): Metrics[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }

  async export(): Promise<string> {
    if (!this.exportConfig) {
      throw new Error("Export not configured");
    }

    const strategy = this.exportStrategies[this.exportConfig.format];

    if (!strategy) {
      throw new Error(`Unsupported export format: ${this.exportConfig.format}`);
    }

    return await strategy();
  }

  private startExportInterval(): void {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }

    this.exportInterval = setInterval(async () => {
      try {
        await this.exportToWebhook();
      } catch (error) {
        console.error("Failed to export metrics:", error);
      }
    }, 60_000);
  }

  private async exportToWebhook(): Promise<string> {
    if (!this.exportConfig) {
      throw new Error("Export not configured");
    }

    const response = await fetch(this.exportConfig.destination, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(this.entries),
    });

    if (!response.ok) {
      throw new Error(`Failed to export metrics: ${response.statusText}`);
    }

    return "Metrics exported successfully";
  }

  private exportToPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.entries) {
      lines.push(`# Agent: ${metric.agentId}`);
      lines.push(`agent_execution_duration_seconds ${metric.duration / 1000}`);
      lines.push(`agent_tokens_input ${metric.tokens.input}`);
      lines.push(`agent_tokens_output ${metric.tokens.output}`);
      lines.push(`agent_tokens_total ${metric.tokens.total}`);
      lines.push(`agent_tool_calls_total ${metric.toolCalls}`);
      lines.push(`agent_retries_total ${metric.retries}`);
      lines.push(`agent_errors_total ${metric.errors}`);
      lines.push(
        `agent_execution_status ${metric.status === "success" ? 1 : 0}`
      );
    }

    return lines.join("\n");
  }

  private exportToDatadog(): Promise<string> {
    const _series = this.entries.map((metric) => ({
      metric: "agent.execution",
      points: [
        [Math.floor(metric.timestamp.getTime() / 1000), metric.duration],
      ],
      tags: [
        `agent:${metric.agentId}`,
        `status:${metric.status}`,
        `errors:${metric.errors}`,
      ],
    }));

    return this.exportToWebhook();
  }

  destroy(): void {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
  }
}

export type AggregateMetrics = {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  totalTokens: number;
  totalToolCalls: number;
  totalRetries: number;
  totalErrors: number;
};
