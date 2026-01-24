import { z } from "zod";
export const MetricsExportSchema = z.object({
  format: z.enum(["json", "prometheus", "datadog", "webhook"]),
  destination: z.string(),
});
export class MetricsCollector {
  entries = [];
  maxEntries;
  exportConfig;
  exportInterval;
  constructor(options = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.exportConfig = options.exportConfig;
    if (this.exportConfig) {
      this.startExportInterval();
    }
  }
  record(metrics) {
    this.entries.push(metrics);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }
  getByAgentId(agentId) {
    return this.entries.filter((m) => m.agentId === agentId);
  }
  getLatestByAgentId(agentId) {
    const agentMetrics = this.getByAgentId(agentId);
    return agentMetrics[agentMetrics.length - 1];
  }
  getAggregateByAgentId(agentId) {
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
  getAll() {
    return [...this.entries];
  }
  clear() {
    this.entries.length = 0;
  }
  async export() {
    if (!this.exportConfig) {
      throw new Error("Export not configured");
    }
    switch (this.exportConfig.format) {
      case "json":
        return JSON.stringify(this.entries, null, 2);
      case "prometheus":
        return this.exportToPrometheus();
      case "datadog":
        return this.exportToDatadog();
      case "webhook":
        return this.exportToWebhook();
      default:
        throw new Error(
          `Unsupported export format: ${this.exportConfig.format}`
        );
    }
  }
  startExportInterval() {
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
  async exportToWebhook() {
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
  exportToPrometheus() {
    const lines = [];
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
  exportToDatadog() {
    const series = this.entries.map((metric) => ({
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
  destroy() {
    if (this.exportInterval) {
      clearInterval(this.exportInterval);
    }
  }
}
