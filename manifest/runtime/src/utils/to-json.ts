import type { Prisma } from "@repo/database/standalone";

/**
 * Safely cast a value to Prisma's InputJsonValue type.
 * Prisma's JSON type is overly strict — this helper provides a clean
 * alternative to the `as unknown as Prisma.InputJsonValue` pattern.
 */
export function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}
