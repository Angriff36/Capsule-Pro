/**
 * Types for the Manifest Policy Editor
 *
 * These types define the structure for visualizing and editing
 * Manifest policies, guards, and constraints.
 */

export interface EntityListItem {
  commands: string[];
  constraints: string[];
  displayName: string;
  name: string;
  policies: string[];
  properties: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
}

export interface EntityDetail {
  commands: CommandDetail[];
  computed: Array<{
    name: string;
    type: string;
    expression: string;
  }>;
  constraints: ConstraintDetail[];
  displayName: string;
  name: string;
  policies: PolicyDetail[];
  properties: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: unknown;
  }>;
}

export interface ConstraintDetail {
  code: string;
  commandName?: string;
  details?: string;
  expression: string;
  level: "entity" | "command";
  message: string;
  name: string;
  severity: "block" | "warn" | "info";
}

export interface GuardDetail {
  expression: string;
  index: number;
  message?: string;
}

export interface CommandDetail {
  constraints: ConstraintDetail[];
  description?: string;
  emittedEvents: string[];
  guards: GuardDetail[];
  mutations: Array<{
    property: string;
    expression: string;
  }>;
  name: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
}

export interface PolicyDetail {
  expression: string;
  message: string;
  name: string;
  targetCommands: string[];
  type: "execute" | "read" | "create" | "update" | "delete";
}

export interface ValidationResult {
  error?: string;
  formatted?: string;
  passed: boolean;
  result?: unknown;
  valid: boolean;
}

export interface TestScenario {
  commandName?: string;
  description: string;
  entityName: string;
  expectedResults: {
    guardResults?: Array<{ guardIndex: number; shouldPass: boolean }>;
    constraintResults?: Array<{
      constraintName: string;
      shouldPass: boolean;
    }>;
    policyDenial?: boolean;
  };
  name: string;
  testData: Record<string, unknown>;
}

export interface TestResult {
  errors?: string[];
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
    };
  };
  scenarioName: string;
}

/**
 * Result from executing a manifest command in the playground
 */
export interface ExecutionResult {
  commandName: string;
  constraints: Array<{
    name: string;
    severity: string;
    passed: boolean;
    message?: string;
  }>;
  entityName: string;
  error?: string;
  executionTime: number;
  guards: Array<{
    index: number;
    expression: string;
    passed: boolean;
    message?: string;
  }>;
  input: Record<string, unknown>;
  output?: {
    result?: Record<string, unknown>;
    events?: Array<{ name: string; payload: Record<string, unknown> }>;
  };
  policy?: {
    denied: boolean;
    policyName?: string;
    reason?: string;
  };
  snapshot?: {
    id: string;
    timestamp: number;
    state: Record<string, unknown>;
  };
  success: boolean;
}

/**
 * Entry in the execution history
 */
export interface ExecutionHistoryEntry {
  commandName: string;
  entityName: string;
  id: string;
  input: Record<string, unknown>;
  result: ExecutionResult;
  timestamp: number;
}
