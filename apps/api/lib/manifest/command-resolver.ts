/**
 * Re-export shared command resolver from @repo/manifest-runtime.
 *
 * Kept for backward-compatible imports from `@/lib/manifest/command-resolver`.
 */

export {
  isRegisteredCommand,
  resolveCommand,
  type ResolvedCommand,
} from "@repo/manifest-runtime/command-resolver";
