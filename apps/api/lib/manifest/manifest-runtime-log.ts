import type { ManifestRuntimeLogger } from "@repo/manifest-runtime/manifest-runtime-factory";
import { log } from "@repo/observability/log";
import { logManifestIssue } from "./issue-log";

const JSON_STORE_PREFIX = "Using PrismaJsonStore for entity:";
const reportedMissingStores = new Set<string>();

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
        // Dedup per entity per process: runtime construction re-reports every
        // store-less entity on each request (820 lines/session of identical
        // spam). First occurrence still lands in the issue log; a command that
        // actually TARGETS a store-less entity fails loudly on its own.
        const dedupKey = entity ?? "(unknown)";
        if (reportedMissingStores.has(dedupKey)) {
          return;
        }
        reportedMissingStores.add(dedupKey);
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
