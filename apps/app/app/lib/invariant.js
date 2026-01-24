Object.defineProperty(exports, "__esModule", { value: true });
exports.InvariantError = void 0;
exports.invariant = invariant;
class InvariantError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvariantError";
  }
}
exports.InvariantError = InvariantError;
/** Runtime invariant helper that narrows truthy values at compile time. */
function invariant(condition, message) {
  if (!condition) {
    throw new InvariantError(message);
  }
}
