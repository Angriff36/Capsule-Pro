/**
 * Types for the Manifest Policy Editor
 *
 * These types define the structure for visualizing and editing
 * Manifest policies, guards, and constraints.
 */

export interface EntityListItem {
  name: string;
  displayName: string;
  commands: string[];
  constraints: string[];
  policies: string[];
  properties: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
}

export interface EntityDetail {
  name: string;
  displayName: string;
  properties: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: unknown;
  }>;
  computed: Array<{
    name: string;
    type: string;
    expression: string;
  }>;
  constraints: ConstraintDetail[];
  commands: CommandDetail[];
  policies: PolicyDetail[];
}

export interface ConstraintDetail {
  name: string;
  code: string;
  severity: "block" | "warn" | "info";
  message: string;
  expression: string;
  level: "entity" | "command";
  commandName?: string;
  details?: string;
}

export interface GuardDetail {
  index: number;
  expression: string;
  message?: string;
}

export interface CommandDetail {
  name: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
  guards: GuardDetail[];
  constraints: ConstraintDetail[];
  mutations: Array<{
    property: string;
    expression: string;
  }>;
  emittedEvents: string[];
}

export interface PolicyDetail {
  name: string;
  type: "execute" | "read" | "create" | "update" | "delete";
  targetCommands: string[];
  expression: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  passed: boolean;
  error?: string;
  result?: unknown;
  formatted?: string;
}

export interface TestScenario {
  name: string;
  description: string;
  entityName: string;
  commandName?: string;
  testData: Record<string, unknown>;
  expectedResults: {
    guardResults?: Array<{ guardIndex: number; shouldPass: boolean }>;
    constraintResults?: Array<{
      constraintName: string;
      shouldPass: boolean;
    }>;
    policyDenial?: boolean;
  };
}

export interface TestResult {
  scenarioName: string;
  passed: boolean;
  results: {
    guards?: Array<{
      index: number;
      expression: string;
      passed: boolean;
    }>;
    constraints?: Array<{
      name: string;
      severity: string;
      passed: boolean;
      message?: string;
    }>;
    policy?: {
      denied: boolean;
      policyName?: string;
      reason?: string;
    }>
}
  errors?: string[];
}

/**
 * Result from executing a manifest command in the playground
 */
export interface ExecutionResult {
  success: boolean;
  commandName: string;
  entityName: string;
  input: Record<string, unknown>;
  output?: {
    result?: Record<string, unknown>;
    events?: Array<{ name: string; payload: Record<string, unknown> }>;
  };
  guards: Array<{
    index: number;
    expression: string;
    passed: boolean;
    message?: string;
  }>;
  constraints: Array<{
    name: string;
    severity: string;
    passed: boolean;
    message?: string;
  }>;
  policy?: {
    denied: boolean;
    policyName?: string;
    reason?: string;
  };
  error?: string;
  snapshot?: {
    id: string;
    timestamp: number;
    state: Record<string, unknown>;
  };
  executionTime: number;
}

/**
 * Entry in the execution history
 */
export interface ExecutionHistoryEntry {
  id: string;
  timestamp: number;
  entityName: string;
  commandName: string;
  input: Record<string, unknown>;
  result: ExecutionResult;
}
