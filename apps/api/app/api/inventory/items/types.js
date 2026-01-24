/**
 * Inventory Item Management API Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_CATEGORIES = exports.FSA_STATUSES = void 0;
// FSA Status values for food safety compliance
exports.FSA_STATUSES = [
  "unknown",
  "requires_review",
  "compliant",
  "non_compliant",
  "exempt",
];
// Item categories for organization
exports.ITEM_CATEGORIES = [
  "dairy",
  "meat",
  "poultry",
  "seafood",
  "produce",
  "dry_goods",
  "frozen",
  "beverages",
  "supplies",
  "equipment",
  "other",
];
