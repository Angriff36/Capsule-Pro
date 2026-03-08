/**
 * SMS Automation Triggers
 *
 * Integration points for triggering SMS automation rules from business events.
 * Import and call these functions from the relevant business logic handlers.
 */
import {
	evaluateAndExecuteRules,
	type RuleEvaluationContext,
	type SmsTriggerType,
} from "./sms-automation-engine";

/**
 * Trigger SMS automation when a task is assigned to an employee
 */
export async function triggerTaskAssignedSms(options: {
	tenantId: string;
	taskId: string;
	taskName: string;
	employeeId: string;
	employeePhone?: string;
	employeeName: string;
	dueDate?: string;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "task_assigned",
		triggerData: {
			taskId: options.taskId,
			taskName: options.taskName,
			employeeId: options.employeeId,
			employeeName: options.employeeName,
			dueDate: options.dueDate,
			...options.additionalData,
		},
		recipientEmployeeId: options.employeeId,
		recipientPhone: options.employeePhone,
		additionalMergeFields: {
			taskId: options.taskId,
			taskName: options.taskName,
			employeeName: options.employeeName,
			dueDate: options.dueDate ?? "Not specified",
		},
	});
}

/**
 * Trigger SMS automation when a task is completed
 */
export async function triggerTaskCompletedSms(options: {
	tenantId: string;
	taskId: string;
	taskName: string;
	completedByEmployeeId: string;
	completedByName: string;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "task_completed",
		triggerData: {
			taskId: options.taskId,
			taskName: options.taskName,
			completedByEmployeeId: options.completedByEmployeeId,
			completedByName: options.completedByName,
			completedAt: new Date().toISOString(),
			...options.additionalData,
		},
		recipientEmployeeId: options.completedByEmployeeId,
		additionalMergeFields: {
			taskId: options.taskId,
			taskName: options.taskName,
			completedByName: options.completedByName,
		},
	});
}

/**
 * Trigger SMS automation when a task becomes overdue
 */
export async function triggerTaskOverdueSms(options: {
	tenantId: string;
	taskId: string;
	taskName: string;
	assignedEmployeeId: string;
	assignedEmployeePhone?: string;
	assignedEmployeeName: string;
	hoursOverdue: number;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "task_overdue",
		triggerData: {
			taskId: options.taskId,
			taskName: options.taskName,
			assignedEmployeeId: options.assignedEmployeeId,
			assignedEmployeeName: options.assignedEmployeeName,
			hoursOverdue: options.hoursOverdue,
			...options.additionalData,
		},
		recipientEmployeeId: options.assignedEmployeeId,
		recipientPhone: options.assignedEmployeePhone,
		additionalMergeFields: {
			taskId: options.taskId,
			taskName: options.taskName,
			assignedEmployeeName: options.assignedEmployeeName,
			hoursOverdue: options.hoursOverdue.toString(),
		},
	});
}

/**
 * Trigger SMS automation when a shift is assigned
 */
export async function triggerShiftAssignedSms(options: {
	tenantId: string;
	shiftId: string;
	shiftDate: string;
	shiftStart: string;
	shiftEnd: string;
	employeeId: string;
	employeePhone?: string;
	employeeName: string;
	stationName?: string;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "shift_assigned",
		triggerData: {
			shiftId: options.shiftId,
			shiftDate: options.shiftDate,
			shiftStart: options.shiftStart,
			shiftEnd: options.shiftEnd,
			employeeId: options.employeeId,
			employeeName: options.employeeName,
			stationName: options.stationName,
			...options.additionalData,
		},
		recipientEmployeeId: options.employeeId,
		recipientPhone: options.employeePhone,
		additionalMergeFields: {
			shiftId: options.shiftId,
			shiftDate: options.shiftDate,
			shiftStart: options.shiftStart,
			shiftEnd: options.shiftEnd,
			employeeName: options.employeeName,
			stationName: options.stationName ?? "Not assigned",
		},
	});
}

/**
 * Trigger SMS automation for shift reminder
 */
export async function triggerShiftReminderSms(options: {
	tenantId: string;
	shiftId: string;
	shiftDate: string;
	shiftStart: string;
	hoursUntilShift: number;
	employeeId: string;
	employeePhone?: string;
	employeeName: string;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "shift_reminder",
		triggerData: {
			shiftId: options.shiftId,
			shiftDate: options.shiftDate,
			shiftStart: options.shiftStart,
			hoursUntilShift: options.hoursUntilShift,
			employeeId: options.employeeId,
			employeeName: options.employeeName,
			...options.additionalData,
		},
		recipientEmployeeId: options.employeeId,
		recipientPhone: options.employeePhone,
		additionalMergeFields: {
			shiftId: options.shiftId,
			shiftDate: options.shiftDate,
			shiftStart: options.shiftStart,
			hours: options.hoursUntilShift.toString(),
			employeeName: options.employeeName,
		},
	});
}

/**
 * Trigger SMS automation when a shift is changed
 */
export async function triggerShiftChangedSms(options: {
	tenantId: string;
	shiftId: string;
	shiftDate: string;
	changeType: "created" | "updated" | "cancelled";
	employeeId: string;
	employeePhone?: string;
	employeeName: string;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "shift_changed",
		triggerData: {
			shiftId: options.shiftId,
			shiftDate: options.shiftDate,
			changeType: options.changeType,
			employeeId: options.employeeId,
			employeeName: options.employeeName,
			...options.additionalData,
		},
		recipientEmployeeId: options.employeeId,
		recipientPhone: options.employeePhone,
		additionalMergeFields: {
			shiftId: options.shiftId,
			shiftDate: options.shiftDate,
			changeType: options.changeType,
			employeeName: options.employeeName,
		},
	});
}

/**
 * Trigger SMS automation for prep list published
 */
export async function triggerPrepListPublishedSms(options: {
	tenantId: string;
	prepListId: string;
	prepListName: string;
	publishedByEmployeeId: string;
	publishedByName: string;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "prep_list_published",
		triggerData: {
			prepListId: options.prepListId,
			prepListName: options.prepListName,
			publishedByEmployeeId: options.publishedByEmployeeId,
			publishedByName: options.publishedByName,
			publishedAt: new Date().toISOString(),
			...options.additionalData,
		},
		additionalMergeFields: {
			prepListId: options.prepListId,
			prepListName: options.prepListName,
			publishedByName: options.publishedByName,
		},
	});
}

/**
 * Trigger SMS automation for inventory low
 */
export async function triggerInventoryLowSms(options: {
	tenantId: string;
	itemId: string;
	itemName: string;
	itemSku: string;
	currentQuantity: number;
	reorderPoint: number;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "inventory_low",
		triggerData: {
			itemId: options.itemId,
			itemName: options.itemName,
			itemSku: options.itemSku,
			currentQuantity: options.currentQuantity,
			reorderPoint: options.reorderPoint,
			triggeredAt: new Date().toISOString(),
			...options.additionalData,
		},
		additionalMergeFields: {
			itemId: options.itemId,
			itemName: options.itemName,
			quantity: options.currentQuantity.toString(),
		},
	});
}

/**
 * Trigger SMS automation for custom event
 */
export async function triggerCustomEventSms(options: {
	tenantId: string;
	eventName: string;
	message: string;
	recipientEmployeeId?: string;
	recipientPhone?: string;
	additionalData?: Record<string, unknown>;
}): Promise<void> {
	await evaluateAndExecuteRules({
		tenantId: options.tenantId,
		triggerType: "custom_event",
		triggerData: {
			eventName: options.eventName,
			message: options.message,
			triggeredAt: new Date().toISOString(),
			...options.additionalData,
		},
		recipientEmployeeId: options.recipientEmployeeId,
		recipientPhone: options.recipientPhone,
		additionalMergeFields: {
			eventName: options.eventName,
			message: options.message,
		},
	});
}
