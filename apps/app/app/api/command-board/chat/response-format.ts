import type { StructuredAgentResponse } from "./agent-loop";

function renderSection(title: string, items: string[]): string[] {
  if (items.length === 0) {
    return [];
  }

  return [title, ...items.map((item) => `- ${item}`)];
}

export function formatStructuredAgentResponseForDisplay(
  payload: StructuredAgentResponse
): string {
  const lines: string[] = [];

  if (payload.summary.trim()) {
    lines.push(payload.summary.trim());
  }

  const sections = [
    renderSection("Actions taken:", payload.actionsTaken),
    renderSection("Errors:", payload.errors),
    renderSection("Next steps:", payload.nextSteps),
  ].filter((section) => section.length > 0);

  for (const section of sections) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(...section);
  }

  return lines.join("\n").trim();
}

