/**
 * SMS Automation Engine
 *
 * Service for evaluating and executing SMS automation rules based on business events.
 * Integrates with the existing SMS notification service.
 */
import { database } from "@repo/database";
import { sendSmsNotification, type SmsRecipient } from "./sms-notification-service";
import type { SmsTemplateData } from "./sms-templates";

// Type for sms_automation_rules from Prisma
type SmsAutomationRule = {
	id: string;
	tenant_id: string;
	name: string;
	description: string | null;
	trigger_type: string;
	trigger_config: unknown;
	template_id: string | null;
	custom_message: string | null;
	recipient_type: string;
	recipient_config: unknown;
	is_active: boolean;
	priority: number;
	created_at: Date;
	updated_at: Date;
	deleted_at: Date | null;
};

/**
 * Trigger types that can fire SMS automation rules
 */
export type SmsTriggerType =
	| "task_assigned"
	| "task_completed"
	| "task_overdue"
	| "shift_assigned"
	| "shift_reminder"
	| "shift_changed"
	| "clock_in_reminder"
	| "clock_out_reminder"
	| "prep_list_published"
	| "inventory_low"
	| "custom_event";

/**
 * Context data passed to rule evaluation
 */
export interface RuleEvaluationContext {
	tenantId: string;
	triggerType: SmsTriggerType;
	triggerData: Record<string, unknown>;
	recipientEmployeeId?: string;
	recipientPhone?: string;
	additionalMergeFields?: Record<string, string>;
}

/**
 * Result of rule evaluation
 */
export interface RuleEvaluationResult {
	ruleId: string;
	ruleName: string;
	triggered: boolean;
	message?: string;
	recipients?: string[];
	error?: string;
}

/**
 * Evaluate and execute all active SMS automation rules for a given trigger
 */
export async function evaluateAndExecuteRules(
	context: RuleEvaluationContext,
): Promise<RuleEvaluationResult[]> {
	const results: RuleEvaluationResult[] = [];

	// Find all active rules for this trigger type
	const activeRules = await database.sms_automation_rules.findMany({
		where: {
			tenant_id: context.tenantId,
			trigger_type: context.triggerType,
			is_active: true,
			deleted_at: null,
		},
		orderBy: {
			priority: "asc",
		},
	});

	// Process each rule
	for (const rule of activeRules) {
		try {
			const result = await evaluateAndExecuteRule(rule, context);
			results.push(result);
		} catch (error) {
			console.error(`Error processing SMS rule ${rule.id}:`, error);
			results.push({
				ruleId: rule.id,
				ruleName: rule.name,
				triggered: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return results;
}

/**
 * Evaluate a single rule and execute if conditions match
 */
async function evaluateAndExecuteRule(
	rule: SmsAutomationRule,
	context: RuleEvaluationContext,
): Promise<RuleEvaluationResult> {
	const result: RuleEvaluationResult = {
		ruleId: rule.id,
		ruleName: rule.name,
		triggered: false,
	};

	// Parse trigger config
	const triggerConfig = rule.trigger_config as Record<string, unknown>;
	const recipientConfig = rule.recipient_config as Record<string, unknown>;

	// Check if rule conditions match
	if (!evaluateTriggerConditions(triggerConfig, context.triggerData)) {
		return result;
	}

	result.triggered = true;

	// Resolve recipients
	const recipients = await resolveRecipients(
		rule.recipient_type,
		recipientConfig,
		context,
	);

	if (recipients.length === 0) {
		result.error = "No recipients resolved";
		return result;
	}

	// Get message content
	const message = rule.custom_message ?? getDefaultMessage(context.triggerType);

	// Merge fields for template
	const mergeFields: SmsTemplateData = {
		...Object.fromEntries(
			Object.entries(context.triggerData).map(([k, v]) => [k, String(v)]),
		),
		...context.additionalMergeFields,
	};

	// Send SMS to all recipients in batch
	result.recipients = [];
	try {
		const smsResults = await sendSmsNotification(database, {
			tenantId: context.tenantId,
			notificationType: `automation_${context.triggerType}`,
			recipients: recipients.map((r) => ({
				employeeId: r.employeeId,
				phoneNumber: r.phone,
			})),
			templateData: mergeFields,
			customMessage: mergeMessageTemplate(message, mergeFields),
		});

		// Count successful sends
		for (const smsResult of smsResults) {
			if (smsResult.success && smsResult.messageId) {
				result.recipients.push(smsResult.messageId);
			}
		}
	} catch (error) {
		console.error(`Failed to send SMS for rule ${rule.id}:`, error);
	}

	result.message = `Sent to ${result.recipients.length} recipients`;
	return result;
}

/**
 * Evaluate if trigger conditions match
 */
function evaluateTriggerConditions(
	config: Record<string, unknown>,
	data: Record<string, unknown>,
): boolean {
	// If no conditions defined, always match
	if (!config || Object.keys(config).length === 0) {
		return true;
	}

	// Check each condition
	for (const [key, value] of Object.entries(config)) {
		if (data[key] !== value) {
			return false;
		}
	}

	return true;
}

/**
 * Resolve recipients based on recipient type and config
 */
async function resolveRecipients(
	recipientType: string,
	config: Record<string, unknown>,
	context: RuleEvaluationContext,
): Promise<Array<{ phone: string; employeeId?: string }>> {
	const recipients: Array<{ phone: string; employeeId?: string }> = [];

	switch (recipientType) {
		case "employee":
			// Direct employee from context
			if (context.recipientEmployeeId && context.recipientPhone) {
				recipients.push({
					employeeId: context.recipientEmployeeId,
					phone: context.recipientPhone,
				});
			}
			break;

		case "manager": {
			// Get managers from the trigger data or tenant
			if (context.triggerData.managerId) {
				const manager = await database.user.findFirst({
					where: {
						id: context.triggerData.managerId as string,
						tenantId: context.tenantId,
					},
				});
				if (manager?.phone) {
					recipients.push({
						employeeId: manager.id,
						phone: manager.phone,
					});
				}
			}
			break;
		}

		case "role_based": {
			// Get employees by role from config
			if (config.roleIds && Array.isArray(config.roleIds)) {
				const employees = await database.user.findMany({
					where: {
						tenantId: context.tenantId,
						roleId: { in: config.roleIds as string[] },
						phone: { not: null },
					},
				});
				for (const emp of employees) {
					if (emp.phone) {
						recipients.push({
							employeeId: emp.id,
							phone: emp.phone,
						});
					}
				}
			}
			break;
		}

		case "custom_phone": {
			// Use phone numbers from config
			if (config.phoneNumbers && Array.isArray(config.phoneNumbers)) {
				for (const phone of config.phoneNumbers) {
					recipients.push({ phone: String(phone) });
				}
			}
			break;
		}
	}

	return recipients;
}

/**
 * Merge template variables into message
 */
function mergeMessageTemplate(
	template: string,
	fields: SmsTemplateData,
): string {
	let result = template;
	for (const [key, value] of Object.entries(fields)) {
		if (value !== undefined) {
			result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value));
		}
	}
	return result;
}

/**
 * Get default message for trigger type
 */
function getDefaultMessage(triggerType: SmsTriggerType): string {
	const messages: Record<SmsTriggerType, string> = {
		task_assigned:
			"{{employeeName}}, you have been assigned a new task: {{taskName}}.",
		task_completed: "Task {{taskName}} has been completed.",
		task_overdue: "Task {{taskName}} is overdue. Please check the status.",
		shift_assigned: "You have been assigned a new shift on {{shiftDate}}.",
		shift_reminder: "Reminder: Your shift starts in {{hours}} hours.",
		shift_changed: "Your shift has been changed. Please check the new details.",
		clock_in_reminder: "Reminder: Don't forget to clock in for your shift.",
		clock_out_reminder: "Reminder: Don't forget to clock out after your shift.",
		prep_list_published: "A new prep list has been published: {{listName}}.",
		inventory_low:
			"Low inventory alert: {{itemName}} is running low ({{quantity}} remaining).",
		custom_event: "Notification: {{message}}",
	};

	return messages[triggerType] || "You have a new notification.";
}
