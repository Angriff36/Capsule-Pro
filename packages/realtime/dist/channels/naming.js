/**
 * Channel naming conventions for realtime events.
 * Phase 1 uses tenant-wide channels only.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChannelName = getChannelName;
exports.getModuleFromEventType = getModuleFromEventType;
exports.parseChannelName = parseChannelName;
exports.isValidTenantChannel = isValidTenantChannel;
/**
 * Generate the Ably channel name for a tenant.
 * Phase 1 pattern: tenant:{tenantId}
 *
 * @param tenantId - The tenant identifier
 * @returns The Ably channel name
 * @throws Error if tenantId is empty or invalid
 */
function getChannelName(tenantId) {
  if (!tenantId || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return `tenant:${tenantId}`;
}
/**
 * Extract the module name from an eventType string.
 * Example: "kitchen.task.claimed" -> "kitchen"
 *
 * @param eventType - The event type string (e.g., "kitchen.task.claimed")
 * @returns The module name (e.g., "kitchen")
 * @throws Error if eventType format is invalid
 */
function getModuleFromEventType(eventType) {
  const parts = eventType.split(".");
  if (parts.length < 2) {
    throw new Error(`Invalid eventType format: ${eventType}`);
  }
  return parts[0];
}
/**
 * Parse a channel name to extract the tenantId.
 *
 * @param channel - The channel name (e.g., "tenant:abc-123")
 * @returns Object with tenantId, or null if not a tenant channel
 */
function parseChannelName(channel) {
  const match = channel.match(/^tenant:(.+)$/);
  return match ? { tenantId: match[1] } : null;
}
/**
 * Check if a channel name is a valid tenant channel.
 *
 * @param channel - The channel name to check
 * @returns true if valid tenant channel
 */
function isValidTenantChannel(channel) {
  return /^tenant:[^:]+$/.test(channel);
}
