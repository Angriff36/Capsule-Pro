// Auto-generated client SDK from Manifest IR
// DO NOT EDIT - This file is generated from .manifest source

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const response = await fetch("/api/inventoryitem");
  if (!response.ok) {
    throw new Error("Failed to fetch InventoryItems");
  }
  const data = await response.json();
  return data.inventoryitems;
}
