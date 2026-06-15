/**
 * Bridge to @angriff36/manifest's bundled MCP explain tooling.
 *
 * The upstream package ships explain handlers inside the tarball (not a public
 * export map entry). We resolve them from the installed package root so Capsule
 * reuses the official formatter instead of maintaining a fork.
 */

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { IR } from "@angriff36/manifest/ir";
import { createIntrospectionStoreProvider } from "./introspection-store-provider.js";

/** Bumped when bridge loading changes — logged at MCP startup for restart verification. */
export const EXPLAIN_BRIDGE_REV = "pathToFileURL-v3";

const require = createRequire(import.meta.url);

const manifestPackageRoot = dirname(
  require.resolve("@angriff36/manifest/package.json")
);

const explainModulePath = join(
  manifestPackageRoot,
  "packages/mcp-server/dist/tools/explain.js"
);
const sessionStoreModulePath = join(
  manifestPackageRoot,
  "packages/mcp-server/dist/state/session-store.js"
);

type ExplainTarget = "entity" | "command" | "policy";

interface ExplainArgs {
  contentHash: string;
  entityName?: string;
  name: string;
  target: ExplainTarget;
}

interface ExplainResult {
  explanation: string;
}

interface SessionStoreModule {
  sessionStore: {
    store: (
      contentHash: string,
      ir: IR,
      context?: Record<string, unknown>,
      options?: { storeProvider?: (entityName: string) => unknown }
    ) => void;
  };
}

interface ExplainModule {
  handleExplain: (args: ExplainArgs) => Promise<ExplainResult>;
}

let sessionStoreModule: SessionStoreModule | null = null;
let explainModule: ExplainModule | null = null;

async function loadSessionStoreModule(): Promise<SessionStoreModule> {
  if (!sessionStoreModule) {
    sessionStoreModule = (await import(
      pathToFileURL(sessionStoreModulePath).href
    )) as SessionStoreModule;
  }
  return sessionStoreModule;
}

async function loadExplainModule(): Promise<ExplainModule> {
  if (!explainModule) {
    explainModule = (await import(
      pathToFileURL(explainModulePath).href
    )) as ExplainModule;
  }
  return explainModule;
}

/** Eager-load upstream explain modules so Windows path bugs fail at startup, not on first tool call. */
export async function warmupExplainBridge(): Promise<void> {
  await loadSessionStoreModule();
  await loadExplainModule();
}

/** Cache IR in upstream session store and return its content hash. */
export async function registerIrWithUpstreamSession(ir: IR): Promise<string> {
  const contentHash =
    ir.provenance?.contentHash ??
    `capsule-${ir.entities?.length ?? 0}-${ir.commands?.length ?? 0}`;

  const { sessionStore } = await loadSessionStoreModule();
  sessionStore.store(
    contentHash,
    ir,
    {},
    { storeProvider: createIntrospectionStoreProvider() }
  );
  return contentHash;
}

/** Explain an IR entity, command, or policy using upstream manifest-mcp formatters. */
export async function explainManifestTarget(
  ir: IR,
  args: {
    target: ExplainTarget;
    name: string;
    entityName?: string;
  }
): Promise<string> {
  const contentHash = await registerIrWithUpstreamSession(ir);
  const { handleExplain } = await loadExplainModule();
  const result = await handleExplain({
    contentHash,
    target: args.target,
    name: args.name,
    entityName: args.entityName,
  });
  return result.explanation;
}
