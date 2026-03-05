/**
 * Rules Engine - Manifest Runtime Integration
 *
 * Integrates the kitchen operations rules engine with the Manifest runtime.
 * Provides hooks for rule evaluation before and after command execution.
 */
import { allergenRules, equipmentRules, prepTaskRules, workflowRules, } from "./rules.js";
import { getRulesEngine, } from "./rules-engine.js";
const DEFAULT_INTEGRATION_CONFIG = {
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
/**
 * Rules Engine Integration Hook
 *
 * Provides integration between the Manifest runtime and the rules engine.
 */
export class RulesEngineIntegration {
    config;
    engine;
    constructor(engine, config) {
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
    registerPredefinedRules() {
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
    async evaluateBeforeCommand(entityType, entityId, command, params, currentState, options) {
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
        const context = this.buildContext(options.tenantId, entityType, entityId, currentState, command, params, options.user, options.relatedData);
        // Get applicable rule sets
        const ruleSetIds = this.config.entityRuleSets[entityType] || [];
        const domain = this.getDomainForEntityType(entityType);
        let ruleResults;
        if (ruleSetIds.length > 0) {
            // Evaluate specific rule sets
            const allResults = [];
            let hasWarnings = false;
            let hasErrors = false;
            let allowed = true;
            for (const ruleSetId of ruleSetIds) {
                const result = this.engine.evaluateRuleSet(ruleSetId, context);
                allResults.push(...result.results);
                if (result.hasWarnings)
                    hasWarnings = true;
                if (result.hasErrors)
                    hasErrors = true;
                if (!result.allowed)
                    allowed = false;
            }
            ruleResults = {
                allowed,
                hasWarnings,
                hasErrors,
                results: allResults,
                message: this.aggregateMessages(allResults),
            };
        }
        else {
            // Evaluate all rules for domain
            ruleResults = this.engine.evaluateAll(context, domain);
        }
        // Determine if operation should proceed
        const allowed = !this.config.blockOnRuleFailure || ruleResults.allowed;
        const errorMessage = !allowed && ruleResults.hasErrors
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
    async evaluateAfterCommand(entityType, entityId, command, result, newState, options) {
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
        const context = this.buildContext(options.tenantId, entityType, entityId, newState, command, {}, options.user, options.relatedData);
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
    buildContext(tenantId, entityType, entityId, entityState, command, params, user, relatedData) {
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
    getOperationTypeFromCommand(command) {
        const commandLower = command.toLowerCase();
        if (commandLower.includes("create"))
            return "create";
        if (commandLower.includes("update") || commandLower.includes("modify"))
            return "update";
        if (commandLower.includes("delete") || commandLower.includes("remove"))
            return "delete";
        if (commandLower === "claim" || commandLower === "start")
            return "claim";
        if (commandLower === "complete")
            return "complete";
        if (commandLower === "cancel")
            return "cancel";
        if (commandLower.includes("transition") || commandLower.includes("status"))
            return "transition";
        return "unknown";
    }
    /**
     * Get the domain for an entity type.
     */
    getDomainForEntityType(entityType) {
        if (entityType.startsWith("Prep") || entityType === "KitchenTask")
            return "prep";
        if (entityType === "Recipe" || entityType === "Ingredient")
            return "kitchen";
        return "all";
    }
    /**
     * Aggregate messages from rule results.
     */
    aggregateMessages(results) {
        if (results.length === 0)
            return "No rules evaluated";
        const failed = results.filter((r) => !r.passed);
        if (failed.length === 0)
            return "All rules passed";
        const blocked = failed.filter((r) => r.severity === "error" || r.severity === "critical");
        if (blocked.length > 0) {
            return `${blocked.length} rule(s) blocking operation`;
        }
        return `${failed.length} rule(s) generated warnings`;
    }
    /**
     * Format error message from rule results.
     */
    formatErrorMessage(result) {
        const blocked = result.results.filter((r) => !r.passed && (r.severity === "error" || r.severity === "critical"));
        const messages = blocked.map((r) => `- ${r.message}`);
        return `Operation blocked by business rules:\n${messages.join("\n")}`;
    }
    // ---------------------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------------------
    /**
     * Update the integration configuration.
     */
    configure(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get the current configuration.
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get the underlying rules engine.
     */
    getEngine() {
        return this.engine;
    }
}
// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------
let globalIntegration;
/**
 * Get the global rules engine integration instance.
 */
export function getRulesEngineIntegration(config) {
    if (!globalIntegration) {
        globalIntegration = new RulesEngineIntegration(undefined, config);
    }
    else if (config) {
        globalIntegration.configure(config);
    }
    return globalIntegration;
}
/**
 * Reset the global integration instance.
 */
export function resetRulesEngineIntegration() {
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
export function createRulesEngineMiddleware(integration) {
    const rulesIntegration = integration ?? getRulesEngineIntegration();
    return async (entityType, entityId, command, params, currentState, options, executeCommand) => {
        // Evaluate before command
        const beforeResult = await rulesIntegration.evaluateBeforeCommand(entityType, entityId, command, params, currentState, options);
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
            };
        }
        // Execute the command
        const commandResult = await executeCommand();
        // Evaluate after command
        const afterResult = await rulesIntegration.evaluateAfterCommand(entityType, entityId, command, commandResult, params, // New state would be determined by the result
        options);
        return {
            ...commandResult,
            ruleResults: beforeResult.ruleResults,
        };
    };
}
