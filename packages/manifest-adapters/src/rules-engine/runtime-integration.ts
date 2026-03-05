/**
 * Rules Engine - Manifest Runtime Integration
 *
 * Integrates the kitchen operations rules engine with the Manifest runtime.
 * Provides hooks for rule evaluation before and after command execution.
 */

import {
  allergenRules,
  equipmentRules,
  prepTaskRules,
  workflowRules,
} from "./rules.js";
import {
  getRulesEngine,
  type KitchenOperationsRulesEngine,
} from "./rules-engine.js";
import type {
  RuleContext,
  RuleEvaluationResult,
  RuleSetEvaluationResult,
} from "./types.js";

// Local CommandResult type for compatibility
export interface CommandResult {
  success: boolean;
  errors?: string[];
  constraintOutcomes?: Array<{
    constraint: string;
    outcome: string;
    severity: string;
    message: string;
  }>;
}

// ---------------------------------------------------------------------------
// Integration Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for rules engine integration with Manifest runtime.
 */
export interface RulesEngineIntegrationConfig {
  /** Whether to evaluate rules before command execution */
  evaluateBeforeCommand: boolean;
  /** Whether to evaluate rules after command execution */
  evaluateAfterCommand: boolean;
  /** Whether to block commands on rule failures */
  blockOnRuleFailure: boolean;
  /** Whether to include rule results in command output */
  includeRuleResults: boolean;
  /** Rule sets to apply for each entity type */
  entityRuleSets: Record<string, string[]>;
}

const DEFAULT_INTEGRATION_CONFIG: RulesEngineIntegrationConfig = {
  evaluateBeforeCommand: true,
  evaluateAfterCommand: false,
  blockOnRuleFailure: true,
  includeRuleResults: true,
  entityRuleSets: {
    PrepTask: ["kitchen-prep-tasks", "kitchen-equipment", "kitchen-allergens"],
    KitchenTask: ["kitchen-equipment", "kitchen-allergens"],
    Recipe: ["kitchen-allergens"],
    Ingredient: ["kitchen-allergens"],
  },
};

// ---------------------------------------------------------------------------
// Manifest Runtime Hook
// ---------------------------------------------------------------------------

/**
 * Options for rule evaluation hooks.
 */
export interface RuleEvaluationOptions {
  /** The tenant ID */
  tenantId: string;
  /** The user performing the operation */
  user?: {
    id: string;
    roles: string[];
  };
  /** Related entity data for cross-validation */
  relatedData?: Array<{
    type: string;
    id: string;
    data: Record<string, unknown>;
  }>;
  /** Whether to throw on rule failures */
  throwOnFailure?: boolean;
}

/**
 * Result of a rule evaluation hook.
 */
export interface RuleHookResult {
  /** Whether the operation should proceed */
  allowed: boolean;
  /** Rule evaluation results */
  ruleResults: RuleSetEvaluationResult;
  /** Error message if not allowed */
  errorMessage?: string;
}

/**
 * Rules Engine Integration Hook
 *
 * Provides integration between the Manifest runtime and the rules engine.
 */
export class RulesEngineIntegration {
  private config: RulesEngineIntegrationConfig;
  private engine: KitchenOperationsRulesEngine;

  constructor(
    engine?: KitchenOperationsRulesEngine,
    config?: Partial<RulesEngineIntegrationConfig>
  ) {
    this.engine = engine ?? getRulesEngine();
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };

    // Register predefined rules
    this.registerPredefinedRules();
  }

  // ---------------------------------------------------------------------------
  // Rule Registration
  // ---------------------------------------------------------------------------

  /**
   * Register all predefined rules with the engine.
   */
  private registerPredefinedRules(): void {
    // Register rules with appropriate rule sets
    const prepTaskRuleSet = this.engine.getRuleSet("kitchen-prep-tasks");
    const equipmentRuleSet = this.engine.getRuleSet("kitchen-equipment");
    const allergenRuleSet = this.engine.getRuleSet("kitchen-allergens");
    const workflowRuleSet = this.engine.getRuleSet("kitchen-workflow");

    if (prepTaskRuleSet) {
      for (const rule of prepTaskRules) {
        if (!prepTaskRuleSet.rules.has(rule.id)) {
          prepTaskRuleSet.rules.set(rule.id, rule);
        }
      }
    }

    if (equipmentRuleSet) {
      for (const rule of equipmentRules) {
        if (!equipmentRuleSet.rules.has(rule.id)) {
          equipmentRuleSet.rules.set(rule.id, rule);
        }
      }
    }

    if (allergenRuleSet) {
      for (const rule of allergenRules) {
        if (!allergenRuleSet.rules.has(rule.id)) {
          allergenRuleSet.rules.set(rule.id, rule);
        }
      }
    }

    if (workflowRuleSet) {
      for (const rule of workflowRules) {
        if (!workflowRuleSet.rules.has(rule.id)) {
          workflowRuleSet.rules.set(rule.id, rule);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Evaluation Hooks
  // ---------------------------------------------------------------------------

  /**
   * Evaluate rules before executing a command.
   *
   * This should be called before command execution to validate
   * that the operation complies with all applicable business rules.
   */
  async evaluateBeforeCommand(
    entityType: string,
    entityId: string,
    command: string,
    params: Record<string, unknown>,
    currentState: Record<string, unknown>,
    options: RuleEvaluationOptions
  ): Promise<RuleHookResult> {
    if (!this.config.evaluateBeforeCommand) {
      return {
        allowed: true,
        ruleResults: {
          allowed: true,
          hasWarnings: false,
          hasErrors: false,
          results: [],
        },
      };
    }

    // Build rule context
    const context = this.buildContext(
      options.tenantId,
      entityType,
      entityId,
      currentState,
      command,
      params,
      options.user,
      options.relatedData
    );

    // Get applicable rule sets
    const ruleSetIds = this.config.entityRuleSets[entityType] || [];
    const domain = this.getDomainForEntityType(entityType);

    let ruleResults: RuleSetEvaluationResult;

    if (ruleSetIds.length > 0) {
      // Evaluate specific rule sets
      const allResults: RuleEvaluationResult[] = [];
      let hasWarnings = false;
      let hasErrors = false;
      let allowed = true;

      for (const ruleSetId of ruleSetIds) {
        const result = this.engine.evaluateRuleSet(ruleSetId, context);
        allResults.push(...result.results);

        if (result.hasWarnings) hasWarnings = true;
        if (result.hasErrors) hasErrors = true;
        if (!result.allowed) allowed = false;
      }

      ruleResults = {
        allowed,
        hasWarnings,
        hasErrors,
        results: allResults,
        message: this.aggregateMessages(allResults),
      };
    } else {
      // Evaluate all rules for domain
      ruleResults = this.engine.evaluateAll(context, domain);
    }

    // Determine if operation should proceed
    const allowed = !this.config.blockOnRuleFailure || ruleResults.allowed;

    const errorMessage =
      !allowed && ruleResults.hasErrors
        ? this.formatErrorMessage(ruleResults)
        : undefined;

    return {
      allowed,
      ruleResults,
      errorMessage,
    };
  }

  /**
   * Evaluate rules after executing a command.
   *
   * This can be used to emit warnings or trigger follow-up actions
   * based on the state changes.
   */
  async evaluateAfterCommand(
    entityType: string,
    entityId: string,
    command: string,
    result: CommandResult,
    newState: Record<string, unknown>,
    options: RuleEvaluationOptions
  ): Promise<RuleHookResult> {
    if (!this.config.evaluateAfterCommand) {
      return {
        allowed: true,
        ruleResults: {
          allowed: true,
          hasWarnings: false,
          hasErrors: false,
          results: [],
        },
      };
    }

    // Build context for post-execution validation
    const context = this.buildContext(
      options.tenantId,
      entityType,
      entityId,
      newState,
      command,
      {},
      options.user,
      options.relatedData
    );

    // Evaluate rules (typically warnings only for post-execution)
    const ruleResults = this.engine.evaluateAll(context, "all");

    return {
      allowed: true, // Post-execution evaluations never block
      ruleResults,
    };
  }

  // ---------------------------------------------------------------------------
  // Context Building
  // ---------------------------------------------------------------------------

  /**
   * Build a RuleContext from operation parameters.
   */
  private buildContext(
    tenantId: string,
    entityType: string,
    entityId: string,
    entityState: Record<string, unknown>,
    command: string,
    params: Record<string, unknown>,
    user?: { id: string; roles: string[] },
    relatedData?: Array<{
      type: string;
      id: string;
      data: Record<string, unknown>;
    }>
  ): RuleContext {
    return {
      tenantId,
      entity: {
        type: entityType,
        id: entityId,
        state: entityState,
      },
      operation: {
        type: this.getOperationTypeFromCommand(command),
        command,
        params,
      },
      related: relatedData
        ? {
            type: relatedData[0]?.type || "",
            data: relatedData.map((r) => r.data),
          }
        : undefined,
      user,
      metadata: {},
    };
  }

  /**
   * Determine operation type from command name.
   */
  private getOperationTypeFromCommand(command: string): string {
    const commandLower = command.toLowerCase();

    if (commandLower.includes("create")) return "create";
    if (commandLower.includes("update") || commandLower.includes("modify"))
      return "update";
    if (commandLower.includes("delete") || commandLower.includes("remove"))
      return "delete";
    if (commandLower === "claim" || commandLower === "start") return "claim";
    if (commandLower === "complete") return "complete";
    if (commandLower === "cancel") return "cancel";
    if (commandLower.includes("transition") || commandLower.includes("status"))
      return "transition";

    return "unknown";
  }

  /**
   * Get the domain for an entity type.
   */
  private getDomainForEntityType(entityType: string): string {
    if (entityType.startsWith("Prep") || entityType === "KitchenTask")
      return "prep";
    if (entityType === "Recipe" || entityType === "Ingredient")
      return "kitchen";
    return "all";
  }

  /**
   * Aggregate messages from rule results.
   */
  private aggregateMessages(results: RuleEvaluationResult[]): string {
    if (results.length === 0) return "No rules evaluated";

    const failed = results.filter((r) => !r.passed);
    if (failed.length === 0) return "All rules passed";

    const blocked = failed.filter(
      (r) => r.severity === "error" || r.severity === "critical"
    );

    if (blocked.length > 0) {
      return `${blocked.length} rule(s) blocking operation`;
    }

    return `${failed.length} rule(s) generated warnings`;
  }

  /**
   * Format error message from rule results.
   */
  private formatErrorMessage(result: RuleSetEvaluationResult): string {
    const blocked = result.results.filter(
      (r) => !r.passed && (r.severity === "error" || r.severity === "critical")
    );

    const messages = blocked.map((r) => `- ${r.message}`);
    return `Operation blocked by business rules:\n${messages.join("\n")}`;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Update the integration configuration.
   */
  configure(config: Partial<RulesEngineIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current configuration.
   */
  getConfig(): RulesEngineIntegrationConfig {
    return { ...this.config };
  }

  /**
   * Get the underlying rules engine.
   */
  getEngine(): KitchenOperationsRulesEngine {
    return this.engine;
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

let globalIntegration: RulesEngineIntegration | undefined;

/**
 * Get the global rules engine integration instance.
 */
export function getRulesEngineIntegration(
  config?: Partial<RulesEngineIntegrationConfig>
): RulesEngineIntegration {
  if (!globalIntegration) {
    globalIntegration = new RulesEngineIntegration(undefined, config);
  } else if (config) {
    globalIntegration.configure(config);
  }
  return globalIntegration;
}

/**
 * Reset the global integration instance.
 */
export function resetRulesEngineIntegration(): void {
  globalIntegration = undefined;
}

// ---------------------------------------------------------------------------
// Middleware Factory
// ---------------------------------------------------------------------------

/**
 * Create a middleware function for Manifest runtime integration.
 *
 * This can be used to wrap runtime command execution with rule evaluation.
 */
export function createRulesEngineMiddleware(
  integration?: RulesEngineIntegration
) {
  const rulesIntegration = integration ?? getRulesEngineIntegration();

  return async (
    entityType: string,
    entityId: string,
    command: string,
    params: Record<string, unknown>,
    currentState: Record<string, unknown>,
    options: RuleEvaluationOptions,
    executeCommand: () => Promise<CommandResult>
  ): Promise<CommandResult & { ruleResults?: RuleSetEvaluationResult }> => {
    // Evaluate before command
    const beforeResult = await rulesIntegration.evaluateBeforeCommand(
      entityType,
      entityId,
      command,
      params,
      currentState,
      options
    );

    if (!beforeResult.allowed) {
      return {
        success: false,
        errors: [
          beforeResult.errorMessage || "Operation blocked by business rules",
        ],
        constraintOutcomes: beforeResult.ruleResults.results.map((r) => ({
          constraint: r.ruleName,
          outcome: r.passed ? "satisfied" : "violated",
          severity: r.severity,
          message: r.message,
        })),
      } as CommandResult & { ruleResults?: RuleSetEvaluationResult };
    }

    // Execute the command
    const commandResult = await executeCommand();

    // Evaluate after command
    const afterResult = await rulesIntegration.evaluateAfterCommand(
      entityType,
      entityId,
      command,
      commandResult,
      params as Record<string, unknown>, // New state would be determined by the result
      options
    );

    return {
      ...commandResult,
      ruleResults: beforeResult.ruleResults,
    } as CommandResult & { ruleResults?: RuleSetEvaluationResult };
  };
}
