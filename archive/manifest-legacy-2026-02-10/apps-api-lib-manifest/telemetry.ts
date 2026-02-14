export interface ManifestTelemetryEvent {
  name: string;
  entityName?: string;
  commandName?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

export type ManifestTelemetryHandler = (
  event: ManifestTelemetryEvent
) => void | Promise<void>;

/**
 * No-op telemetry hook scaffold.
 */
export const onManifestTelemetryEvent: ManifestTelemetryHandler = async () => {
  return;
};
