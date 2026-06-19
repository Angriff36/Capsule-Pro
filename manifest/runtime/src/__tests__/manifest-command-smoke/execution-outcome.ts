import type { RunManifestCommandCoreFailure } from "../../run-manifest-command-core.js";

const GUARD_LIKE =
  /guard|constraint|!= null|!= ""|required|must be|invalid|denied by guard|not allowed|cannot /i;

export type ExecutionDisposition = "success" | "expected_block" | "real_failure";

export function classifyExecutionOutcome(
  result: RunManifestCommandCoreFailure
): { disposition: ExecutionDisposition; detail: string } {
  const detail = `[${result.kind}] ${result.message}`;

  if (
    result.kind === "guard_failed" ||
    result.kind === "constraint_blocked"
  ) {
    return { disposition: "expected_block", detail };
  }

  if (result.kind === "policy_denied") {
    return {
      disposition: "expected_block",
      detail: `${detail} (needs richer role/scenario fixture — not an admin smoke create)`,
    };
  }

  if (result.kind === "command_failed" && GUARD_LIKE.test(result.message)) {
    return { disposition: "expected_block", detail };
  }

  if (
    result.kind === "runtime_error" &&
    /must not be null/.test(result.message) &&
    /createdAt|updatedAt/.test(result.message)
  ) {
    return { disposition: "real_failure", detail };
  }

  if (
    result.kind === "runtime_error" ||
    result.kind === "command_failed" ||
    result.kind === "bootstrap_failed"
  ) {
    return { disposition: "real_failure", detail };
  }

  return { disposition: "expected_block", detail };
}
