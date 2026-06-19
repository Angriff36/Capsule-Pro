import type { SmokeReport } from "./types";

export function formatSmokeReport(report: SmokeReport): string {
  const lines: string[] = [
    "=== Manifest Command Smoke Report ===",
    `Total commands: ${report.totalCommands}`,
    `Payloads built: ${report.payloadBuilt}`,
    `Executed (safe create): ${report.executed}`,
    `Expected guard/policy blocks: ${report.guardExpectedFail}`,
    `Scenario-required (skipped): ${report.scenarioRequired}`,
    `Destructive (skipped): ${report.destructiveSkipped}`,
    `Real failures: ${report.realFailures.length}`,
    "",
  ];

  if (report.realFailures.length > 0) {
    lines.push("--- REAL FAILURES (fix these) ---");
    for (const failure of report.realFailures.slice(0, 40)) {
      lines.push(
        `[${failure.phase}] ${failure.commandId}: ${failure.message}`
      );
    }
    if (report.realFailures.length > 40) {
      lines.push(`... and ${report.realFailures.length - 40} more`);
    }
    lines.push("");
  }

  lines.push("--- Samples: executed ---");
  lines.push(report.samples.executed.slice(0, 15).join(", ") || "(none)");
  lines.push("");
  lines.push("--- Samples: expected guard/policy blocks ---");
  lines.push(
    report.samples.guardExpectedFail.slice(0, 15).join(", ") || "(none)"
  );
  lines.push("");
  lines.push("--- Samples: scenario-required ---");
  lines.push(
    report.samples.scenarioRequired.slice(0, 15).join(", ") || "(none)"
  );
  lines.push("");
  lines.push("--- Samples: destructive skipped ---");
  lines.push(
    report.samples.destructiveSkipped.slice(0, 15).join(", ") || "(none)"
  );

  return lines.join("\n");
}
