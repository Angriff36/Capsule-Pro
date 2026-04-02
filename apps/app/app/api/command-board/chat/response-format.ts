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

  // Only show sections if there are errors or if there's no summary
  // (natural language responses from query path already contain all info in summary)
  const hasErrors = payload.errors.length > 0;
  const hasSummary = payload.summary.trim().length > 0;

  const sections = [
    // Only show actions if there are errors or no summary
    ...(!hasSummary ? [renderSection("Actions taken:", payload.actionsTaken)] : []),
    renderSection("Errors:", payload.errors),
    ...(hasErrors ? [renderSection("Next steps:", payload.nextSteps)] : []),
  ].filter((section) => section.length > 0);

  for (const section of sections) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(...section);
  }

  return lines.join("\n").trim();
}
