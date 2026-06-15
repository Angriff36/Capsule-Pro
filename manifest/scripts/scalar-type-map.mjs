/**
 * scalar-type-map.mjs — single shared Manifest scalar → TypeScript type mapping.
 *
 * WHY THIS EXISTS (D23 remediation):
 *   The scalar→TS map was triplicated across generate-capsule-client.mjs:
 *     (1) the toTsTypes() regex pass for the types surface,
 *     (2) the SCALAR_TO_TS object for command parameter typing,
 *     (3) implicit in the hooks generator's reliance on the client output.
 *   This module is the one canonical source. Both generators import from here.
 *
 * Wire convention: dates are ISO 8601 strings (manifest/capsule-conventions.json
 * dateSerialization). Money/decimal/int/float/bigint are JS number on the wire.
 */

/** Manifest scalar name → TypeScript type. */
export const SCALAR_TO_TS = {
  string: "string",
  datetime: "string",
  number: "number",
  decimal: "number",
  money: "number",
  int: "number",
  float: "number",
  bigint: "number",
  boolean: "boolean",
  bool: "boolean",
  array: "unknown[]",
  json: "unknown",
  text: "string",
  uuid: "string",
};

/**
 * Resolve an IR parameter (type object) to its TypeScript type string.
 * Handles simple scalars, generic arrays (e.g. array<string>), and falls back
 * to "unknown" for unmapped types.
 *
 * @param {{ type?: string | { name?: string; generic?: string | { name?: string } } }} p
 *   IR parameter shape — p.type may be a bare string or a {name, generic} object.
 * @returns {string} TypeScript type annotation.
 */
export function paramTsType(p) {
  const typeObj = p.type || {};
  const typeName =
    typeof typeObj === "string" ? typeObj : typeObj.name || "string";
  const base = SCALAR_TO_TS[typeName] || "unknown";
  // Resolve array generic type (e.g. tags: string[] instead of unknown[])
  if (base === "unknown[]" && typeObj.generic) {
    const innerType =
      SCALAR_TO_TS[typeObj.generic.name || typeObj.generic] || "unknown";
    return `${innerType}[]`;
  }
  return base;
}

/**
 * Regex-based source transform: replace raw Manifest scalar names in the
 * stock `types` projection output with correct TypeScript types.
 *
 * The stock `types` surface emits raw scalar names (int/decimal/money/array/Date)
 * as TS types, which don't compile. This maps them to TS per Capsule's wire
 * conventions.
 *
 * @param {string} src — raw types projection output.
 * @returns {string} — compilable TypeScript with scalar names resolved.
 */
export function toTsTypes(src) {
  return src
    .replace(/:\s*(int|bigint|float|decimal|money|number)\b/g, ": number")
    .replace(/:\s*bool\b/g, ": boolean")
    .replace(/:\s*array\b/g, ": unknown[]")
    .replace(/:\s*json\b/g, ": unknown")
    .replace(/:\s*(text|uuid)\b/g, ": string")
    .replace(/:\s*Date\b/g, ": string");
}
