"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CodeIcon,
  CopyIcon,
  XCircleIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useState } from "react";

/**
 * Constraint outcome from the Manifest runtime
 */
export interface ConstraintOutcome {
  code: string;
  constraintName: string;
  severity: "ok" | "warn" | "block";
  formatted: string;
  message?: string;
  details?: Record<string, unknown>;
  passed: boolean;
  overridden?: boolean;
  overriddenBy?: string;
  resolved?: Array<{ expression: string; value: unknown }>;
}

/**
 * Command result from the Manifest runtime
 */
export interface CommandResult {
  success: boolean;
  constraintOutcomes?: ConstraintOutcome[];
  guardFailure?: {
    index: number;
    formatted: string;
    expression: string;
    resolved?: Array<{ expression: string; value: unknown }>;
  };
  policyDenial?: {
    policyName: string;
    formatted: string;
    expression: string;
    message?: string;
    resolved?: Array<{ expression: string; value: unknown }>;
  };
}

/**
 * Severity badge component
 */
function SeverityBadge({ severity }: { severity: "ok" | "warn" | "block" }) {
  switch (severity) {
    case "ok":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-400">
          <CheckCircle2Icon className="h-3 w-3" />
          OK
        </span>
      );
    case "warn":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
          <AlertTriangleIcon className="h-3 w-3" />
          WARN
        </span>
      );
    case "block":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400">
          <XCircleIcon className="h-3 w-3" />
          BLOCK
        </span>
      );
    default:
      return null;
  }
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return `[${value.map(formatValue).join(", ")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj).slice(0, 5); // Limit for display
    return `{ ${entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(", ")}${Object.keys(obj).length > 5 ? ", ..." : ""} }`;
  }
  return String(value);
}

/**
 * Format a constraint code for display
 */
function _formatConstraintCode(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text: string): void {
  void navigator.clipboard.writeText(text);
}

/**
 * Resolved values expansion component
 */
function ResolvedValues({
  resolved,
}: {
  resolved: Array<{ expression: string; value: unknown }>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <CodeIcon className="h-3 w-3" />
        {expanded ? "Hide" : "Show"} Resolved Values ({resolved.length})
      </button>
      {expanded && (
        <div className="mt-2 rounded-md bg-slate-900/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Expression Evaluations
            </span>
            <button
              className="text-xs text-slate-500 hover:text-slate-300"
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(
                    resolved,
                    (_key, value) =>
                      typeof value === "bigint" ? value.toString() : value,
                    2
                  )
                )
              }
              type="button"
            >
              <CopyIcon className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1">
            {resolved.map((item, index) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-2 text-xs font-mono"
                key={index}
              >
                <span className="text-blue-300">{item.expression}</span>
                <span className="text-slate-400">
                  {formatValue(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Test data for demonstration
 */
const mockCommandResults: CommandResult[] = [
  {
    success: false,
    guardFailure: {
      index: 0,
      formatted: "not self.completed",
      expression: "not self.completed",
      resolved: [
        { expression: "not self.completed", value: false },
        { expression: "self.completed", value: true },
      ],
    },
  },
  {
    success: false,
    policyDenial: {
      policyName: "adminOnly",
      formatted: 'user.role == "admin"',
      expression: 'user.role == "admin"',
      message: "Only administrators can execute commands",
      resolved: [
        { expression: "user.role", value: "user" },
        { expression: 'user.role == "admin"', value: false },
      ],
    },
  },
  {
    success: false,
    constraintOutcomes: [
      {
        code: "POSITIVE_AMOUNT",
        constraintName: "positiveAmount",
        severity: "block",
        formatted: "self.amount >= 0",
        message: "Amount must be non-negative",
        passed: false,
        resolved: [
          { expression: "self.amount >= 0", value: false },
          { expression: "self.amount", value: -100 },
        ],
      },
    ],
  },
  {
    success: true,
    constraintOutcomes: [
      {
        code: "HIGH_PRIORITY",
        constraintName: "highPriority",
        severity: "warn",
        formatted: "self.priority >= 8",
        message: "High priority task - assign soon",
        passed: false,
        resolved: [
          { expression: "self.priority >= 8", value: true },
          { expression: "self.priority", value: 9 },
        ],
      },
      {
        code: "RECENTLY_CREATED",
        constraintName: "recentlyCreated",
        severity: "ok",
        formatted: "self.createdAt > now() - 86400000",
        message: "Created within last 24 hours",
        passed: true,
        resolved: [
          { expression: "self.createdAt", value: 1_704_500_000_000 },
          { expression: "now() - 86400000", value: 1_704_500_000_000 },
        ],
      },
    ],
  },
];

/**
 * Constraint diagnostics card component
 */
function ConstraintDiagnosticsCard({
  result,
  index,
}: {
  result: CommandResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(true);

  // Determine the type of failure/diagnostic
  const hasGuardFailure = result.guardFailure !== undefined;
  const hasPolicyDenial = result.policyDenial !== undefined;
  const hasConstraints =
    result.constraintOutcomes && result.constraintOutcomes.length > 0;
  const failedConstraints =
    result.constraintOutcomes?.filter((c) => !c.passed) || [];

  return (
    <div
      className={`dev-console-panel ${result.success ? "border-green-500/20" : "border-rose-500/20"}`}
    >
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <div className="flex items-center gap-3">
          {result.success ? (
            <CheckCircle2Icon className="h-5 w-5 text-green-400" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-rose-400" />
          )}
          <div>
            <h3 className="font-medium text-slate-200">
              {hasGuardFailure && "Guard Failure"}
              {hasPolicyDenial && "Policy Denial"}
              {!(hasGuardFailure || hasPolicyDenial) && hasConstraints
                ? `${failedConstraints.length} Constraint${failedConstraints.length === 1 ? "" : "s"}`
                : "Command Result"}
            </h3>
            <p className="text-xs text-slate-500">
              {hasGuardFailure && `Guard index: ${result.guardFailure?.index}`}
              {hasPolicyDenial && `Policy: ${result.policyDenial?.policyName}`}
              {!(hasGuardFailure || hasPolicyDenial) &&
                `${result.constraintOutcomes?.length || 0} constraint(s) evaluated`}
            </p>
          </div>
        </div>
        <span
          className={`text-xs transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Guard Failure Details */}
          {hasGuardFailure && (
            <div className="rounded-md bg-slate-900/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-rose-400">
                  Guard Condition Failed
                </span>
                <button
                  className="text-xs text-slate-500 hover:text-slate-300"
                  onClick={() =>
                    copyToClipboard(result.guardFailure?.formatted)
                  }
                  type="button"
                >
                  <CopyIcon className="h-3 w-3" />
                </button>
              </div>
              <code className="block rounded bg-slate-950 px-2 py-1 text-sm text-rose-300">
                {result.guardFailure?.formatted}
              </code>
              {result.guardFailure?.resolved && (
                <ResolvedValues resolved={result.guardFailure.resolved} />
              )}
            </div>
          )}

          {/* Policy Denial Details */}
          {hasPolicyDenial && (
            <div className="rounded-md bg-slate-900/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-amber-400">
                  Policy Denied
                </span>
                <button
                  className="text-xs text-slate-500 hover:text-slate-300"
                  onClick={() =>
                    copyToClipboard(result.policyDenial?.formatted)
                  }
                  type="button"
                >
                  <CopyIcon className="h-3 w-3" />
                </button>
              </div>
              <code className="block rounded bg-slate-950 px-2 py-1 text-sm text-amber-300">
                {result.policyDenial?.formatted}
              </code>
              {result.policyDenial?.message && (
                <p className="mt-2 text-xs text-slate-400">
                  {result.policyDenial.message}
                </p>
              )}
              {result.policyDenial?.resolved && (
                <ResolvedValues resolved={result.policyDenial.resolved} />
              )}
            </div>
          )}

          {/* Constraint Outcomes */}
          {hasConstraints && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Constraint Evaluations
                </span>
                <span className="text-xs text-slate-500">
                  {result.constraintOutcomes?.filter((c) => c.passed).length}{" "}
                  passed / {failedConstraints.length} failed
                </span>
              </div>
              {result.constraintOutcomes?.map((outcome, i) => (
                <div
                  className={`rounded-md border p-3 ${outcome.passed ? "border-slate-700 bg-slate-900/30" : "border-rose-500/20 bg-rose-500/5"}`}
                  key={i}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <SeverityBadge severity={outcome.severity} />
                        <span className="text-xs font-mono text-slate-500">
                          {outcome.code}
                        </span>
                        <span className="text-xs text-slate-400">
                          {outcome.constraintName}
                        </span>
                      </div>
                      {outcome.message && (
                        <p className="mb-1 text-xs text-slate-300">
                          {outcome.message}
                        </p>
                      )}
                      <code className="block rounded bg-slate-950 px-2 py-1 text-xs text-slate-300">
                        {outcome.formatted}
                      </code>
                    </div>
                    <button
                      className="text-xs text-slate-500 hover:text-slate-300"
                      onClick={() =>
                        copyToClipboard(
                          `${outcome.constraintName}: ${outcome.formatted}`
                        )
                      }
                      type="button"
                    >
                      <CopyIcon className="h-3 w-3" />
                    </button>
                  </div>
                  {outcome.resolved && outcome.resolved.length > 0 && (
                    <ResolvedValues resolved={outcome.resolved} />
                  )}
                  {outcome.overridden && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                      <AlertTriangleIcon className="h-3 w-3" />
                      Overridden by {outcome.overriddenBy}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ConstraintDiagnosticsClient = () => {
  const [commandResults, setCommandResults] =
    useState<CommandResult[]>(mockCommandResults);
  const [jsonInput, setJsonInput] = useState("");
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"demo" | "custom">("demo");

  // Parse JSON input
  const handleParseJson = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setParsingError(null);

      try {
        const parsed = JSON.parse(jsonInput) as CommandResult | CommandResult[];
        const results = Array.isArray(parsed) ? parsed : [parsed];
        setCommandResults(results);
        setSelectedTab("custom");
      } catch (err) {
        setParsingError(
          err instanceof Error ? err.message : "Invalid JSON format"
        );
      }
    },
    [jsonInput]
  );

  // Load example JSON
  const loadExample = useCallback(() => {
    setJsonInput(JSON.stringify(mockCommandResults[0], null, 2));
  }, []);

  return (
    <div className="dev-console-stack">
      {/* Header */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h1>Constraint Diagnostics</h1>
            <p>Inspect constraint outcomes with resolved values</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-700">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === "demo"
                ? "border-b-2 border-blue-400 text-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => setSelectedTab("demo")}
            type="button"
          >
            Demo Data
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === "custom"
                ? "border-b-2 border-blue-400 text-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
            onClick={() => setSelectedTab("custom")}
            type="button"
          >
            Custom JSON
          </button>
        </div>
      </div>

      {/* Demo Tab */}
      {selectedTab === "demo" && (
        <div className="space-y-4">
          <div className="dev-console-panel">
            <div className="dev-console-panel-header">
              <div>
                <h2>Example Diagnostics</h2>
                <p>Sample constraint outcomes from Manifest runtime</p>
              </div>
            </div>
            <div className="grid gap-4">
              {commandResults.map((result, index) => (
                <ConstraintDiagnosticsCard
                  index={index}
                  key={index}
                  result={result}
                />
              ))}
            </div>
          </div>

          {/* Info Panel */}
          <div className="dev-console-panel">
            <div className="dev-console-panel-header">
              <div>
                <h2>About Constraint Diagnostics</h2>
                <p>Understanding constraint outcomes and resolved values</p>
              </div>
            </div>
            <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-3">
              <div>
                <p className="mb-2 font-medium text-slate-300">
                  Severity Levels
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <span className="text-green-400">OK</span> - Informational
                    only
                  </li>
                  <li>
                    <span className="text-amber-400">WARN</span> - Warning,
                    allows execution
                  </li>
                  <li>
                    <span className="text-rose-400">BLOCK</span> - Blocks
                    execution
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-medium text-slate-300">
                  Resolved Values
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Show expression evaluation results</li>
                  <li>Include sub-expression values</li>
                  <li>Help debug constraint logic</li>
                  <li>Reveal actual vs expected values</li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-medium text-slate-300">Usage</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Inspect command failures</li>
                  <li>Debug constraint logic</li>
                  <li>Validate override decisions</li>
                  <li>Test constraint expressions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom JSON Tab */}
      {selectedTab === "custom" && (
        <div className="space-y-4">
          <div className="dev-console-panel">
            <div className="dev-console-panel-header">
              <div>
                <h2>Paste Command Result</h2>
                <p>Enter a JSON CommandResult object to inspect</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleParseJson}>
              <div>
                <textarea
                  className="dev-console-input min-h-[200px] w-full font-mono text-sm"
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='{"success": false, "guardFailure": {...}}'
                  value={jsonInput}
                />
                {parsingError && (
                  <p className="mt-2 text-xs text-rose-400">{parsingError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="dev-console-button dev-console-button-primary"
                  disabled={!jsonInput.trim()}
                  type="submit"
                >
                  Parse & Display
                </button>
                <button
                  className="dev-console-button dev-console-button-secondary"
                  onClick={loadExample}
                  type="button"
                >
                  Load Example
                </button>
              </div>
            </form>
          </div>

          {/* Parsed Results */}
          {commandResults.length > 0 && (
            <div className="dev-console-panel">
              <div className="dev-console-panel-header">
                <div>
                  <h2>Parsed Diagnostics</h2>
                  <p>
                    {commandResults.length} command result
                    {commandResults.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                {commandResults.map((result, index) => (
                  <ConstraintDiagnosticsCard
                    index={index}
                    key={index}
                    result={result}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
