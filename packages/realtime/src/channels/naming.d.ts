/**
 * Channel naming conventions for realtime events.
 * Phase 1 uses tenant-wide channels only.
 */
/**
 * Generate the Ably channel name for a tenant.
 * Phase 1 pattern: tenant:{tenantId}
 *
 * @param tenantId - The tenant identifier
 * @returns The Ably channel name
 * @throws Error if tenantId is empty or invalid
 */
export declare function getChannelName(tenantId: string): string;
/**
 * Extract the module name from an eventType string.
 * Example: "kitchen.task.claimed" -> "kitchen"
 *
 * @param eventType - The event type string (e.g., "kitchen.task.claimed")
 * @returns The module name (e.g., "kitchen")
 * @throws Error if eventType format is invalid
 */
export declare function getModuleFromEventType(eventType: string): string;
/**
 * Parse a channel name to extract the tenantId.
 *
 * @param channel - The channel name (e.g., "tenant:abc-123")
 * @returns Object with tenantId, or null if not a tenant channel
 */
export declare function parseChannelName(channel: string): {
  tenantId: string;
} | null;
/**
 * Check if a channel name is a valid tenant channel.
 *
 * @param channel - The channel name to check
 * @returns true if valid tenant channel
 */
export declare function isValidTenantChannel(channel: string): boolean;
//# sourceMappingURL=naming.d.ts.map
