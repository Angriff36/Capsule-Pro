/**
 * Stock/Inventory domain realtime events.
 * These events represent state changes in stock levels.
 */
import type { RealtimeEventBase } from "./envelope.js";
/**
 * Emitted when stock is manually adjusted.
 */
export interface InventoryStockAdjustedEvent extends RealtimeEventBase {
    eventType: "inventory.stock.adjusted";
    payload: {
        /** Stock item identifier */
        stockItemId: string;
        /** Quantity adjusted (positive for increase, negative for decrease) */
        quantity: number;
        /** Reason for adjustment */
        reason: string;
        /** Employee who made the adjustment */
        employeeId: string;
        /** ISO 8601 timestamp of adjustment */
        adjustedAt: string;
        /** Previous quantity before adjustment */
        previousQuantity: number;
        /** New quantity after adjustment */
        newQuantity: number;
    };
}
/**
 * Emitted when stock is consumed by a prep task.
 */
export interface InventoryStockConsumedEvent extends RealtimeEventBase {
    eventType: "inventory.stock.consumed";
    payload: {
        /** Stock item identifier */
        stockItemId: string;
        /** Quantity consumed */
        quantity: number;
        /** Prep task that consumed the stock */
        prepTaskId: string;
        /** Employee who recorded the consumption */
        employeeId: string;
        /** ISO 8601 timestamp of consumption */
        consumedAt: string;
        /** Previous quantity before consumption */
        previousQuantity: number;
        /** New quantity after consumption */
        newQuantity: number;
    };
}
/**
 * Emitted when stock is received from a purchase order.
 */
export interface InventoryStockReceivedEvent extends RealtimeEventBase {
    eventType: "inventory.stock.received";
    payload: {
        /** Stock item identifier */
        stockItemId: string;
        /** Quantity received */
        quantity: number;
        /** Purchase order line item */
        purchaseOrderLineItemId: string;
        /** Employee who received the stock */
        employeeId: string;
        /** ISO 8601 timestamp of receiving */
        receivedAt: string;
        /** Previous quantity before receiving */
        previousQuantity: number;
        /** New quantity after receiving */
        newQuantity: number;
        /** Supplier identifier (optional) */
        supplierId?: string;
    };
}
/**
 * Emitted when stock is wasted.
 */
export interface InventoryStockWastedEvent extends RealtimeEventBase {
    eventType: "inventory.stock.wasted";
    payload: {
        /** Stock item identifier */
        stockItemId: string;
        /** Quantity wasted */
        quantity: number;
        /** Waste reason */
        reason: string;
        /** Employee who recorded the waste */
        employeeId: string;
        /** ISO 8601 timestamp of waste entry */
        wastedAt: string;
        /** Previous quantity before waste */
        previousQuantity: number;
        /** New quantity after waste */
        newQuantity: number;
        /** Waste category (optional, e.g., "spoilage", "breakage", "theft") */
        wasteCategory?: string;
    };
}
/** Union type of all stock/inventory events */
export type StockEvent = InventoryStockAdjustedEvent | InventoryStockConsumedEvent | InventoryStockReceivedEvent | InventoryStockWastedEvent;
//# sourceMappingURL=stock.d.ts.map