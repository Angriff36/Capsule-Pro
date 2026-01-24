/**
 * Shipment Management API Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_CONDITIONS = exports.SHIPMENT_STATUSES = void 0;
// Shipment Status values from schema
exports.SHIPMENT_STATUSES = [
  "draft",
  "scheduled",
  "preparing",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
];
// Shipment Item condition values
exports.ITEM_CONDITIONS = ["good", "damaged", "spoiled", "short", "excess"];
