export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvariantError";
  }
}

/** Runtime invariant helper that narrows truthy values at compile time. */
export function invariant(
  condition: unknown,
  message: string
): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}
