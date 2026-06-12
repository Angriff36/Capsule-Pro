import type { ManifestRuntimeLogger } from "@repo/manifest-runtime/manifest-runtime-factory";
import { log } from "@repo/observability/log";
import { logManifestIssue } from "./issue-log";

const JSON_STORE_PREFIX = "Using PrismaJsonStore for entity:";
const MISSING_STORE_PREFIX = "No store for entity";

function extractEntityName(
  message: string,
  prefix: string
): string | undefined {
  const quoted = message.match(new RegExp(`${prefix}\\s+"([^"]+)"`));
  if (quoted?.[1]) {
    return quoted[1];
  }

  const suffix = message.slice(message.indexOf(prefix) + prefix.length).trim();
  return suffix.length > 0 ? suffix.replace(/["']/g, "") : undefined;
}

/** Routes manifest-runtime factory logs into the persistent issue log. */
export function createManifestRuntimeLogger(): ManifestRuntimeLogger {
  return {
    info(message, meta) {
      if (message.includes(JSON_STORE_PREFIX)) {
        const entity = extractEntityName(message, JSON_STORE_PREFIX);
        logManifestIssue({
          kind: "store_json_fallback",
          entity,
          message: "Entity uses PrismaJsonStore (no typed Prisma store)",
          details: meta,
        });
        return;
      }

      log.info(message, meta);
    },
    error(message, meta) {
      if (message.includes(MISSING_STORE_PREFIX)) {
        const entity = extractEntityName(message, MISSING_STORE_PREFIX);
        logManifestIssue({
          kind: "store_missing",
          entity,
          message: "No Prisma store registered — commands will fail",
          details: meta,
        });
        return;
      }

      log.error(message, meta);
    },
  };
}
