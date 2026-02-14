// Auto-generated TypeScript types from Manifest IR
// DO NOT EDIT - This file is generated from .manifest source

export interface InventoryItem {
  id: string;
  tenantId: string;
  name: string;
  itemType?: string;
  category?: string;
  baseUnit?: string;
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  parLevel?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  costPerUnit?: number;
  supplierId?: string;
  locationId?: string;
  allergens?: string;
  isActive?: boolean;
  lastCountedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}
