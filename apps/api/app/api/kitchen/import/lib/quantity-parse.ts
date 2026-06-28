import { parseDecimalOpt } from "./parse-helpers";

export interface ParsedQuantity {
  description: string;
  quantity: number;
  unit: string;
}

/** Parse kitchen amounts like "5 POUNDS", "1/2 CUP", "6 #10 CANS". */
export function parseQuantityText(
  value: string | null | undefined
): ParsedQuantity {
  if (!value?.trim()) {
    return { quantity: 1, unit: "ea", description: "" };
  }

  const trimmed = value.trim();
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/i);
  if (fractionMatch?.[1] && fractionMatch[2] && fractionMatch[3]) {
    const quantity =
      Number.parseInt(fractionMatch[1], 10) /
      Number.parseInt(fractionMatch[2], 10);
    return {
      quantity,
      unit: fractionMatch[3].trim(),
      description: trimmed,
    };
  }

  const numericMatch = trimmed.match(/^([\d.]+)\s+(.+)$/);
  if (numericMatch?.[2]) {
    const quantity = parseDecimalOpt(numericMatch[1]) ?? 1;
    return {
      quantity,
      unit: numericMatch[2].trim(),
      description: trimmed,
    };
  }

  return { quantity: 1, unit: trimmed, description: trimmed };
}
