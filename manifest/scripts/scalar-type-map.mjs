/**
 * scalar-type-map.mjs — Manifest scalar → TypeScript mapping for COMMAND INPUT types.
 *
 * As of manifest 2.18.6 the stock `--surface types` projection emits correct entity
 * types directly: numeric → number, `array`/`list` → typed `T[]`, enums → unions, and
 * (via `dateSerialization: iso-string` in manifest.config.yaml) datetime → string. The
 * old `toTsTypes()` regex post-process was retired. This module now exists only for
 * `paramTsType`, which types COMMAND INPUT interfaces from raw IR params in
 * generate-capsule-client.mjs (the stock client surface isn't used for those).
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
