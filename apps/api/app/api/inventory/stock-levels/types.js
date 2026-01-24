/**
 * Stock Levels Management Types
 *
 * Types for stock levels, adjustments, and transaction history.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADJUSTMENT_STATUSES =
  exports.STOCK_REORDER_STATUSES =
  exports.ADJUSTMENT_REASONS =
  exports.TRANSACTION_TYPES =
    void 0;
// ============================================================================
// Constants
// ============================================================================
/**
 * Valid transaction types
 */
exports.TRANSACTION_TYPES = [
  "purchase",
  "usage",
  "adjustment",
  "transfer",
  "waste",
  "return",
  "production",
];
/**
 * Valid adjustment reasons
 */
exports.ADJUSTMENT_REASONS = [
  "damage",
  "expired",
  "lost",
  "found",
  "correction",
  "physical_count",
  "theft",
  "spoilage",
  "other",
];
/**
 * Valid stock reorder statuses
 */
exports.STOCK_REORDER_STATUSES = ["below_par", "at_par", "above_par"];
/**
 * Valid adjustment statuses
 */
exports.ADJUSTMENT_STATUSES = ["pending", "approved", "rejected", "completed"];
