/** Type declarations for entity-domain-map.mjs — canonical ENTITY_DOMAIN_MAP source. */
export const ENTITY_DOMAIN_MAP: Record<string, string>;
export function toCamelCase(value: string): string;
export const ENTITY_ACCESSOR_OVERRIDES: Record<string, string | null>;
export const ENTITY_FIELD_OVERRIDES: Record<
  string,
  { tenantId?: string; createdAt?: string | null }
>;
export const ENTITY_DETAIL_DROP: Set<string>;
export const ENTITY_DETAIL_SEGMENT_OVERRIDES: Record<string, string>;
export const FLAT_SEGMENT_TO_ENTITY: Record<string, string>;
export function resolveAccessor(entityName: string): {
  naive: string;
  accessor: string | null;
  drop: boolean;
  overridden: boolean;
};
export function resolveDetailSegment(entityName: string): string;
export function applyFieldOverrides(
  content: string,
  entityName: string
): { content: string; rewrites: string[] };
