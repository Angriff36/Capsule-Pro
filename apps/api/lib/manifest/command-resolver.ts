/**
 * Re-export shared command resolver from @repo/manifest-runtime.
 *
 * Kept for backward-compatible imports from `@/lib/manifest/command-resolver`.
 */

export {
  isRegisteredCommand,
  type ResolvedCommand,
  resolveCommand,
} from "@repo/manifest-runtime/command-resolver";
