/**
 * Warehouse Receiving / Purchase Orders API Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISCREPANCY_TYPES =
  exports.QUALITY_STATUSES =
  exports.PO_STATUSES =
    void 0;
// Purchase Order Status values
exports.PO_STATUSES = [
  "draft",
  "submitted",
  "confirmed",
  "partial",
  "received",
  "cancelled",
];
// Quality Status values for receiving items
exports.QUALITY_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_inspection",
];
// Discrepancy Type values
exports.DISCREPANCY_TYPES = [
  "none",
  "shortage",
  "overage",
  "damaged",
  "wrong_item",
];
