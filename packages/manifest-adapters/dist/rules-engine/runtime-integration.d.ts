/**
 * Rules Engine - Manifest Runtime Integration
 *
 * Integrates the kitchen operations rules engine with the Manifest runtime.
 * Provides hooks for rule evaluation before and after command execution.
 */
import { type KitchenOperationsRulesEngine } from "./rules-engine.js";
import type { RuleSetEvaluationResult } from "./types.js";
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
export declare class RulesEngineIntegration {
    private config;
    private engine;
    constructor(engine?: KitchenOperationsRulesEngine, config?: Partial<RulesEngineIntegrationConfig>);
    /**
     * Register all predefined rules with the engine.
     */
    private registerPredefinedRules;
    /**
     * Evaluate rules before executing a command.
     *
     * This should be called before command execution to validate
     * that the operation complies with all applicable business rules.
     */
    evaluateBeforeCommand(entityType: string, entityId: string, command: string, params: Record<string, unknown>, currentState: Record<string, unknown>, options: RuleEvaluationOptions): Promise<RuleHookResult>;
    /**
     * Evaluate rules after executing a command.
     *
     * This can be used to emit warnings or trigger follow-up actions
     * based on the state changes.
     */
    evaluateAfterCommand(entityType: string, entityId: string, command: string, result: CommandResult, newState: Record<string, unknown>, options: RuleEvaluationOptions): Promise<RuleHookResult>;
    /**
     * Build a RuleContext from operation parameters.
     */
    private buildContext;
    /**
     * Determine operation type from command name.
     */
    private getOperationTypeFromCommand;
    /**
     * Get the domain for an entity type.
     */
    private getDomainForEntityType;
    /**
     * Aggregate messages from rule results.
     */
    private aggregateMessages;
    /**
     * Format error message from rule results.
     */
    private formatErrorMessage;
    /**
     * Update the integration configuration.
     */
    configure(config: Partial<RulesEngineIntegrationConfig>): void;
    /**
     * Get the current configuration.
     */
    getConfig(): RulesEngineIntegrationConfig;
    /**
     * Get the underlying rules engine.
     */
    getEngine(): KitchenOperationsRulesEngine;
}
/**
 * Get the global rules engine integration instance.
 */
export declare function getRulesEngineIntegration(config?: Partial<RulesEngineIntegrationConfig>): RulesEngineIntegration;
/**
 * Reset the global integration instance.
 */
export declare function resetRulesEngineIntegration(): void;
/**
 * Create a middleware function for Manifest runtime integration.
 *
 * This can be used to wrap runtime command execution with rule evaluation.
 */
export declare function createRulesEngineMiddleware(integration?: RulesEngineIntegration): (entityType: string, entityId: string, command: string, params: Record<string, unknown>, currentState: Record<string, unknown>, options: RuleEvaluationOptions, executeCommand: () => Promise<CommandResult>) => Promise<CommandResult & {
    ruleResults?: RuleSetEvaluationResult;
}>;
//# sourceMappingURL=runtime-integration.d.ts.map