"use client";

/**
 * Pilot adoption of generated TanStack Query hooks (Task 5.2).
 *
 * This file demonstrates the pattern for 3 entity domains:
 * 1. InventoryItem — list/detail queries + create/update/softDelete mutations
 * 2. Client — list queries + create/update mutations
 * 3. Recipe — list/detail queries
 *
 * The generated hooks come from manifest-hooks.generated.ts which wraps
 * the generated client (manifest-client.generated.ts). All mutations route
 * through the canonical Manifest dispatcher (/api/manifest/{entity}/commands/{command}).
 *
 * To adopt in a component:
 *   import { useInventoryItemList, useInventoryItemCreateMutation } from "@/app/lib/manifest-hooks-pilot";
 *
 * See event-hooks.ts for the full optimistic-update pattern with the generated hooks.
 */

// Re-export the most commonly used hooks for 3 pilot domains.
// Full hook library: see manifest-hooks.generated.ts (171 list + 188 detail + 999 mutation hooks)
export {
  // Inventory domain
  useInventoryItemList,
  useInventoryItemDetail,
  useInventoryItemCreateMutation,
  useInventoryItemUpdateMutation,
  useInventoryItemSoftDeleteMutation,

  // Client domain
  useClientList,
  useClientDetail,
  useClientCreateMutation,
  useClientUpdateMutation,
  useClientArchiveMutation,
  useClientReactivateMutation,

  // Recipe domain
  useRecipeList,
  useRecipeDetail,
  useRecipeCreateMutation,
  useRecipeUpdateMutation,
  useRecipeActivateMutation,
  useRecipeDeactivateMutation,

  // Query key factory (for custom invalidation)
  queryKeys,
} from "./manifest-hooks.generated";
