/**
 * Frozen Manifest IR — a static, build-time snapshot of the compiled IR.
 *
 * `kitchen.ir.generated.json` is a verbatim copy of `manifest/ir/kitchen.ir.json`
 * produced by `pnpm manifest:ir:embed` (manifest/scripts/embed-ir.mjs) and
 * refreshed as the `api#manifest-embed` Turbo step before `api#build`. Importing
 * it as a module means the bundler inlines the IR and V8's module cache parses it
 * exactly ONCE — the dispatcher's cold-start path no longer walks the filesystem
 * to find the repo root, `readFileSync`s the ~7MB IR, and re-reads it to hash it
 * (see manifest/runtime/src/runtime/loadManifests.ts).
 *
 * The runtime factory accepts this via its `ir` dep (see manifest-runtime.ts);
 * when absent it falls back to the filesystem loader, so other apps are unaffected.
 *
 * DO NOT EDIT the `.json` by hand — it is drift-gated against the DSL sources by
 * `pnpm manifest:ir:embed:check` (wired into `manifest:ci`).
 *
 * @packageDocumentation
 */

import type { IR } from "@angriff36/manifest/ir";
import frozenIr from "./kitchen.ir.generated.json";

/** The compiled Manifest IR, frozen at build time. */
export const FROZEN_IR = frozenIr as unknown as IR;
