/**
 * Predefined Kitchen Operations Rules
 *
 * Collection of predefined rules for kitchen operations including
 * prep task dependencies, equipment requirements, allergen constraints,
 * and workflow validation.
 */
import { RuleOutcomeType, RuleSeverity, RuleType } from "./types.js";
// ---------------------------------------------------------------------------
// Rule Factory Helpers
// ---------------------------------------------------------------------------
function createRule(id, name, description, severity, validate, options) {
    return {
        id,
        name,
        description,
        type: RuleType.Custom,
        severity,
        overridable: options?.overridable ?? severity !== RuleSeverity.Critical,
        enabled: true,
        appliesTo: options?.appliesTo ?? [],
        tags: options?.tags ?? [],
        validate,
    };
}
function success(rule) {
    return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: true,
        outcome: RuleOutcomeType.Allowed,
        severity: RuleSeverity.Info,
        message: `${rule.name} passed`,
        overridable: rule.overridable,
    };
}
function failure(rule, message, details, suggestions) {
    return {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        outcome: rule.severity === RuleSeverity.Error ||
            rule.severity === RuleSeverity.Critical
            ? RuleOutcomeType.Blocked
            : RuleOutcomeType.AllowedWithWarning,
        severity: rule.severity,
        message,
        details,
        overridable: rule.overridable,
        suggestions,
    };
}
// ---------------------------------------------------------------------------
// Prep Task Dependency Rules
// ---------------------------------------------------------------------------
/**
 * Rule: Prep task cannot be claimed if its recipe is not active.
 */
export const prepTaskRecipeActiveRule = createRule("prep-task-recipe-active", "Recipe Must Be Active", "Prep tasks can only be claimed if the associated recipe is active", RuleSeverity.Error, (context) => {
    const state = context.entity.state;
    if (!state.recipeId) {
        return success(prepTaskRecipeActiveRule);
    }
    if (state.recipeActive === false) {
        return failure(prepTaskRecipeActiveRule, "Cannot claim prep task - the recipe is inactive", { recipeId: state.recipeId }, ["Activate the recipe", "Select a different recipe"]);
    }
    return success(prepTaskRecipeActiveRule);
}, { appliesTo: ["PrepTask"], tags: ["recipe", "prep", "dependency"] });
/**
 * Rule: Prep task cannot be completed if dependencies are not satisfied.
 */
export const prepTaskDependencyRule = createRule("prep-task-dependencies", "Prep Task Dependencies", "Prep tasks must have all dependencies satisfied before completion", RuleSeverity.Error, (context) => {
    const state = context.entity.state;
    const operation = context.operation.type;
    // Only check on complete operation
    if (operation !== "complete" && operation !== "updateStatus") {
        return success(prepTaskDependencyRule);
    }
    const deps = state.dependencies || [];
    const statuses = state.dependencyStatuses || {};
    const incompleteDeps = deps.filter((depId) => statuses[depId] !== "done" && statuses[depId] !== "completed");
    if (incompleteDeps.length > 0) {
        return failure(prepTaskDependencyRule, `Cannot complete task - ${incompleteDeps.length} dependencies not satisfied`, {
            incompleteDependencies: incompleteDeps,
            totalDependencies: deps.length,
        }, ["Complete all dependencies first", "Contact manager to override"]);
    }
    return success(prepTaskDependencyRule);
}, { appliesTo: ["PrepTask"], tags: ["dependency", "workflow"] });
/**
 * Rule: Prep tasks with high difficulty recipes require certified staff.
 */
export const prepTaskCertificationRule = createRule("prep-task-certification", "Recipe Certification Required", "High difficulty recipes require staff with appropriate certifications", RuleSeverity.Warning, (context) => {
    const state = context.entity.state;
    const user = context.user;
    const difficulty = state.recipeDifficulty ?? 1;
    // High difficulty (4+) requires certification
    if (difficulty >= 4 && user) {
        const hasCertification = user.roles.includes("senior_cook") ||
            user.roles.includes("kitchen_lead") ||
            user.roles.includes("certified_chef");
        if (!hasCertification) {
            return failure(prepTaskCertificationRule, "This task requires senior staff certification", {
                recipeDifficulty: difficulty,
                userRoles: user.roles,
            }, ["Assign to certified staff", "Have certified staff supervise"]);
        }
    }
    return success(prepTaskCertificationRule);
}, { appliesTo: ["PrepTask"], tags: ["certification", "safety"] });
// ---------------------------------------------------------------------------
// Equipment Requirement Rules
// ---------------------------------------------------------------------------
/**
 * Rule: Station must have required equipment for the assigned task.
 */
export const stationEquipmentRule = createRule("station-equipment", "Station Equipment Requirements", "Tasks can only be assigned to stations with required equipment", RuleSeverity.Error, (context) => {
    const state = context.entity.state;
    if (!(state.stationId && state.equipmentRequired?.length)) {
        return success(stationEquipmentRule);
    }
    // Get station equipment from related data
    const stationData = context.related?.data.find((d) => d.type === "Station" && d.id === state.stationId);
    if (!stationData) {
        return failure(stationEquipmentRule, "Station not found or does not have equipment information", { stationId: state.stationId });
    }
    const stationEquipment = stationData.equipmentList || "";
    const availableEquipment = stationEquipment
        .split(",")
        .map((e) => e.trim().toLowerCase());
    const requiredEquipment = state.equipmentRequired.map((e) => e.toLowerCase());
    const missing = requiredEquipment.filter((req) => !availableEquipment.some((avail) => avail.includes(req) || req.includes(avail)));
    if (missing.length > 0) {
        return failure(stationEquipmentRule, `Station missing required equipment: ${missing.join(", ")}`, {
            stationId: state.stationId,
            missingEquipment: missing,
            availableEquipment,
        }, ["Assign to different station", "Move equipment to station"]);
    }
    return success(stationEquipmentRule);
}, { appliesTo: ["PrepTask", "KitchenTask"], tags: ["equipment", "station"] });
/**
 * Rule: Equipment capacity cannot be exceeded.
 */
export const equipmentCapacityRule = createRule("equipment-capacity", "Equipment Capacity Limits", "Equipment has capacity limits that cannot be exceeded", RuleSeverity.Warning, (context) => {
    const state = context.entity.state;
    const operation = context.operation.type;
    // Only check on claim/start operations
    if (operation !== "claim" && operation !== "start") {
        return success(equipmentCapacityRule);
    }
    // Check if any required equipment is at capacity
    // This would need to query current equipment usage
    // For now, just pass
    return success(equipmentCapacityRule);
}, { appliesTo: ["PrepTask", "KitchenTask"], tags: ["equipment", "capacity"] });
// ---------------------------------------------------------------------------
// Allergen Constraint Rules
// ---------------------------------------------------------------------------
/**
 * Rule: Critical allergens must be acknowledged before proceeding.
 */
export const allergenAcknowledgmentRule = createRule("allergen-acknowledgment", "Allergen Acknowledgment Required", "Tasks involving allergens must be acknowledged before starting", RuleSeverity.Warning, (context) => {
    const state = context.entity.state;
    const operation = context.operation.type;
    // Check on claim/start operations
    if (operation !== "claim" && operation !== "start") {
        return success(allergenAcknowledgmentRule);
    }
    const allergens = state.allergens || [];
    if (allergens.length > 0 && !state.allergenAcknowledged) {
        return failure(allergenAcknowledgmentRule, `This task involves allergens: ${allergens.join(", ")}. Acknowledgment required.`, {
            allergens,
            eventId: state.eventId,
        }, ["Review allergen information", "Acknowledge allergens to proceed"]);
    }
    return success(allergenAcknowledgmentRule);
}, { appliesTo: ["PrepTask", "KitchenTask"], tags: ["allergen", "safety"] });
/**
 * Rule: Cross-contamination prevention for allergens.
 */
export const allergenCrossContaminationRule = createRule("allergen-cross-contamination", "Allergen Cross-Contamination Prevention", "Tasks with allergens require special handling to prevent cross-contamination", RuleSeverity.Warning, (context) => {
    const state = context.entity.state;
    const operation = context.operation.type;
    if (operation !== "claim" && operation !== "start") {
        return success(allergenCrossContaminationRule);
    }
    const allergens = state.allergens || [];
    const majorAllergens = allergens.filter((a) => [
        "nuts",
        "peanuts",
        "tree nuts",
        "dairy",
        "milk",
        "gluten",
        "wheat",
        "soy",
        "eggs",
        "shellfish",
        "fish",
    ].includes(a.toLowerCase()));
    if (majorAllergens.length > 0) {
        // Check if station has allergen handling capabilities
        const stationData = context.related?.data.find((d) => d.type === "Station" && d.id === state.stationId);
        const hasAllergenZone = stationData?.allergenZone === true;
        if (!hasAllergenZone) {
            return failure(allergenCrossContaminationRule, `This task contains major allergens and requires special handling: ${majorAllergens.join(", ")}`, {
                allergens: majorAllergens,
                stationId: state.stationId,
            }, [
                "Use designated allergen station",
                "Clean and sanitize equipment thoroughly",
                "Use separate containers",
            ]);
        }
    }
    return success(allergenCrossContaminationRule);
}, {
    appliesTo: ["PrepTask", "KitchenTask"],
    tags: ["allergen", "safety", "contamination"],
});
// ---------------------------------------------------------------------------
// Workflow Validation Rules
// ---------------------------------------------------------------------------
/**
 * Rule: Status transitions must follow defined workflow.
 */
export const workflowTransitionRule = createRule("workflow-transition", "Valid Status Transition", "Status changes must follow the defined workflow transitions", RuleSeverity.Error, (context) => {
    const state = context.entity.state;
    const params = context.operation.params;
    // Get current and target status
    const currentStatus = state.status || "open";
    const targetStatus = params.status || params.newStatus;
    if (!targetStatus || targetStatus === currentStatus) {
        return success(workflowTransitionRule);
    }
    // Define valid transitions based on entity type
    const validTransitions = {
        PrepTask: {
            open: ["in_progress", "canceled"],
            pending: ["in_progress", "canceled"],
            in_progress: ["done", "open", "canceled"],
            done: [], // Terminal state
            canceled: [], // Terminal state
        },
        KitchenTask: {
            open: ["in_progress", "canceled"],
            pending: ["in_progress", "canceled"],
            in_progress: ["done", "open", "canceled"],
            done: [],
            canceled: [],
        },
    };
    const entityType = context.entity.type;
    const transitions = validTransitions[entityType];
    if (!transitions) {
        return success(workflowTransitionRule); // Unknown entity, allow
    }
    const allowedTargets = transitions[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
        return failure(workflowTransitionRule, `Invalid status transition from '${currentStatus}' to '${targetStatus}'`, {
            currentStatus,
            targetStatus,
            allowedTargets,
        }, ["Use a valid status transition", "Cancel and recreate if needed"]);
    }
    return success(workflowTransitionRule);
}, { appliesTo: ["PrepTask", "KitchenTask"], tags: ["workflow", "transition"] });
/**
 * Rule: Tasks cannot be claimed if station is at capacity.
 */
export const stationCapacityRule = createRule("station-capacity", "Station Capacity Check", "Tasks cannot be assigned to stations at full capacity", RuleSeverity.Error, (context) => {
    const state = context.entity.state;
    const operation = context.operation.type;
    if (operation !== "claim" && operation !== "create") {
        return success(stationCapacityRule);
    }
    if (!state.stationId) {
        return success(stationCapacityRule); // No station, no capacity check
    }
    const stationData = context.related?.data.find((d) => d.type === "Station" && d.id === state.stationId);
    if (!stationData) {
        return success(stationCapacityRule); // No station data, allow
    }
    const capacity = stationData.capacitySimultaneousTasks || 1;
    const currentTaskCount = stationData.currentTaskCount || 0;
    if (currentTaskCount >= capacity) {
        return failure(stationCapacityRule, `Station is at full capacity (${currentTaskCount}/${capacity} tasks)`, {
            stationId: state.stationId,
            currentTaskCount,
            capacity,
        }, [
            "Choose a different station",
            "Wait for station capacity to free up",
            "Have manager override",
        ]);
    }
    return success(stationCapacityRule);
}, { appliesTo: ["PrepTask", "KitchenTask"], tags: ["capacity", "station"] });
// ---------------------------------------------------------------------------
// Timing Rules
// ---------------------------------------------------------------------------
/**
 * Rule: Overdue tasks should be prioritized.
 */
export const overdueTaskRule = createRule("overdue-task-priority", "Overdue Task Priority", "Overdue tasks should be addressed before starting new tasks", RuleSeverity.Warning, (context) => {
    const state = context.entity.state;
    const operation = context.operation.type;
    const now = Date.now();
    // Only warn on claim/start operations
    if (operation !== "claim" && operation !== "start") {
        return success(overdueTaskRule);
    }
    if (!state.dueByDate ||
        state.status === "done" ||
        state.status === "canceled") {
        return success(overdueTaskRule);
    }
    const isOverdue = now > state.dueByDate;
    if (!isOverdue) {
        return success(overdueTaskRule);
    }
    const overdueHours = Math.floor((now - state.dueByDate) / (1000 * 60 * 60));
    return failure(overdueTaskRule, `This task is ${overdueHours} hour(s) overdue`, {
        dueByDate: state.dueByDate,
        overdueHours,
    }, ["Prioritize this task immediately", "Contact manager about delay"]);
}, { appliesTo: ["PrepTask", "KitchenTask"], tags: ["timing", "priority"] });
/**
 * Rule: Tasks with long prep times should be started early.
 */
export const longPrepTimeRule = createRule("long-prep-time", "Long Preparation Time Warning", "Tasks with long prep times should be started well in advance", RuleSeverity.Info, (context) => {
    const state = context.entity.state;
    const now = Date.now();
    const prepTime = state.prepTimeMinutes || 0;
    const dueDate = state.dueByDate || 0;
    if (prepTime < 120 || !dueDate) {
        return success(longPrepTimeRule);
    }
    const timeUntilDue = dueDate - now;
    const timeUntilDueMinutes = timeUntilDue / (1000 * 60);
    if (timeUntilDueMinutes < prepTime * 1.5) {
        return failure(longPrepTimeRule, `This task requires ${prepTime} minutes but only has ${Math.floor(timeUntilDueMinutes)} minutes until due`, {
            prepTimeMinutes: prepTime,
            timeUntilDueMinutes: Math.floor(timeUntilDueMinutes),
        }, ["Start immediately", "Consider adjusting schedule"]);
    }
    return success(longPrepTimeRule);
}, { appliesTo: ["PrepTask", "KitchenTask"], tags: ["timing", "planning"] });
// ---------------------------------------------------------------------------
// Rule Collections
// ---------------------------------------------------------------------------
/**
 * All prep task rules.
 */
export const prepTaskRules = [
    prepTaskRecipeActiveRule,
    prepTaskDependencyRule,
    prepTaskCertificationRule,
    stationEquipmentRule,
    stationCapacityRule,
    allergenAcknowledgmentRule,
    allergenCrossContaminationRule,
    workflowTransitionRule,
    overdueTaskRule,
    longPrepTimeRule,
];
/**
 * All equipment rules.
 */
export const equipmentRules = [
    stationEquipmentRule,
    equipmentCapacityRule,
];
/**
 * All allergen rules.
 */
export const allergenRules = [
    allergenAcknowledgmentRule,
    allergenCrossContaminationRule,
];
/**
 * All workflow rules.
 */
export const workflowRules = [
    workflowTransitionRule,
    stationCapacityRule,
];
/**
 * All rules.
 */
export const allRules = [
    ...prepTaskRules,
    ...equipmentRules,
    ...allergenRules,
    ...workflowRules,
];
// ---------------------------------------------------------------------------
// Workflow Transition Configurations
// ---------------------------------------------------------------------------
/**
 * Valid workflow transitions for PrepTask.
 */
export const prepTaskTransitions = [
    {
        from: "open",
        to: "in_progress",
        conditions: ["station_available", "user_authenticated"],
        guards: [],
        requiresAcknowledgment: false,
    },
    {
        from: "in_progress",
        to: "done",
        conditions: ["dependencies_satisfied", "quantity_completed"],
        guards: [],
        requiresAcknowledgment: false,
    },
    {
        from: ["open", "in_progress"],
        to: "canceled",
        conditions: [],
        guards: ["manager_or_higher"],
        requiresAcknowledgment: true,
    },
];
/**
 * Valid workflow transitions for KitchenTask.
 */
export const kitchenTaskTransitions = [
    {
        from: "open",
        to: "in_progress",
        conditions: ["user_authenticated"],
        guards: [],
        requiresAcknowledgment: false,
    },
    {
        from: "in_progress",
        to: "done",
        conditions: ["task_completed"],
        guards: [],
        requiresAcknowledgment: false,
    },
];
// ---------------------------------------------------------------------------
// Dependency Rule Configurations
// ---------------------------------------------------------------------------
/**
 * Common prep task dependencies.
 */
export const prepTaskDependencies = [
    {
        sourceEntityType: "PrepTask",
        targetEntityType: "Recipe",
        relationshipProperty: "recipeId",
        required: true,
        mode: "exists",
    },
    {
        sourceEntityType: "PrepTask",
        targetEntityType: "Station",
        relationshipProperty: "stationId",
        required: false,
        mode: "valid",
    },
];
/**
 * Allergen rule configurations by allergen type.
 */
export const allergenRuleConfigs = {
    critical: {
        allergens: ["peanuts", "tree nuts", "shellfish"],
        severity: RuleSeverity.Critical,
        crossContamination: true,
        requiredActions: [
            "Use dedicated equipment",
            "Clean all surfaces",
            "Inform kitchen staff",
            "Label clearly",
        ],
    },
    major: {
        allergens: ["dairy", "milk", "eggs", "soy", "wheat", "gluten", "fish"],
        severity: RuleSeverity.Warning,
        crossContamination: true,
        requiredActions: ["Clean equipment", "Label clearly"],
    },
    minor: {
        allergens: ["sesame", "mustard", "sulfites"],
        severity: RuleSeverity.Info,
        crossContamination: false,
        requiredActions: ["Label clearly"],
    },
};
