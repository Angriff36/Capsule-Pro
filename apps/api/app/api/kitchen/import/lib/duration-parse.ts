import { parseIntOpt } from "./parse-helpers";

/** Parse kitchen time strings like "20 MINUTES", "1 HOUR", "1 HOUR 20 MINUTES". */
export function parseDurationToMinutes(value: string | null | undefined): number {
  if (!value?.trim()) {
    return 0;
  }

  const normalized = value.toLowerCase();
  let total = 0;

  const hourMatches = normalized.matchAll(/(\d+)\s*(?:hour|hr|hrs)\b/g);
  for (const match of hourMatches) {
    if (match[1]) {
      total += Number.parseInt(match[1], 10) * 60;
    }
  }

  const minuteMatches = normalized.matchAll(/(\d+)\s*(?:minutes|minute|min|mins)\b/g);
  for (const match of minuteMatches) {
    if (match[1]) {
      total += Number.parseInt(match[1], 10);
    }
  }

  if (total > 0) {
    return total;
  }

  return parseIntOpt(value) ?? 0;
}
