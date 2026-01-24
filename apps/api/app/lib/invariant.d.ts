export declare class InvariantError extends Error {
  constructor(message: string);
}
/** Runtime invariant helper that narrows truthy values at compile time. */
export declare function invariant(
  condition: unknown,
  message: string
): asserts condition;
//# sourceMappingURL=invariant.d.ts.map
