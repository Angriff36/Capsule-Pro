/**
 * Email Template Rendering Utility
 *
 * Supports template strings with {{field}} placeholders that are replaced
 * with actual values at render time. Used by the email notification service.
 */

export interface EmailTemplateData {
  [key: string]: string | number | undefined;
}

/**
 * Common merge fields available for email templates
 */
export const COMMON_MERGE_FIELDS = {
  // Recipient fields
  recipientName: "The recipient's full name",
  recipientEmail: "The recipient's email address",

  // Event fields
  eventName: "The name of the event",
  eventDate: "The date of the event",
  eventTime: "The start time of the event",
  eventLocation: "The venue/location of the event",
  eventStatus: "The current status of the event",

  // Task fields
  taskName: "The name/title of the task",
  taskDescription: "The task description",
  taskDueDate: "The task due date",
  taskPriority: "The task priority level",

  // Shift fields
  shiftDate: "The date of the shift",
  shiftTime: "The start time of the shift",
  shiftEndTime: "The end time of the shift",
  location: "The shift location",
  role: "The role/position for the shift",

  // Proposal/Contract fields
  proposalUrl: "Link to view the proposal",
  contractUrl: "Link to sign the contract",
  totalPrice: "The total price/amount",
  companyName: "The company name (Convoy)",

  // Links
  dashboardUrl: "Link to the Convoy dashboard",
  loginUrl: "Link to the login page",
};

/**
 * Renders a template string by replacing {{field}} placeholders with actual values
 */
export function renderEmailTemplate(
  template: string,
  data: EmailTemplateData
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      rendered = rendered.replace(placeholder, String(value));
    }
  }

  return rendered;
}

/**
 * Validates that all required placeholders in a template have values
 */
export function validateTemplateData(
  template: string,
  data: EmailTemplateData
): { valid: boolean; missingFields: string[] } {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const requiredFields = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(template)) !== null) {
    requiredFields.add(match[1]);
  }

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === "") {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Extracts all merge field names from a template
 */
export function extractMergeFields(template: string): string[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const fields = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(template)) !== null) {
    fields.add(match[1]);
  }

  return Array.from(fields);
}

/**
 * Gets description for a merge field
 */
export function getMergeFieldDescription(field: string): string {
  return (
    COMMON_MERGE_FIELDS[field as keyof typeof COMMON_MERGE_FIELDS] ??
    "Custom field"
  );
}

/**
 * Predefined email notification types with suggested merge fields
 */
export const EMAIL_NOTIFICATION_TYPES = {
  event_confirmed: {
    name: "Event Confirmed",
    description: "Sent when an event status changes to confirmed",
    suggestedFields: [
      "recipientName",
      "eventName",
      "eventDate",
      "eventTime",
      "eventLocation",
    ],
  },
  event_canceled: {
    name: "Event Canceled",
    description: "Sent when an event is canceled",
    suggestedFields: [
      "recipientName",
      "eventName",
      "eventDate",
      "eventLocation",
    ],
  },
  event_completed: {
    name: "Event Completed",
    description: "Sent when an event is marked as completed",
    suggestedFields: ["recipientName", "eventName", "eventDate"],
  },
  task_assigned: {
    name: "Task Assigned",
    description: "Sent when a task is assigned to an employee",
    suggestedFields: [
      "recipientName",
      "taskName",
      "taskDueDate",
      "taskPriority",
      "dashboardUrl",
    ],
  },
  task_completed: {
    name: "Task Completed",
    description: "Sent when a task is marked complete (to supervisor)",
    suggestedFields: ["recipientName", "taskName", "taskDueDate"],
  },
  task_reminder: {
    name: "Task Reminder",
    description: "Scheduled reminder for upcoming task deadlines",
    suggestedFields: [
      "recipientName",
      "taskName",
      "taskDueDate",
      "dashboardUrl",
    ],
  },
  shift_reminder: {
    name: "Shift Reminder",
    description: "Scheduled reminder for upcoming shifts",
    suggestedFields: [
      "recipientName",
      "shiftDate",
      "shiftTime",
      "location",
      "role",
    ],
  },
  proposal_sent: {
    name: "Proposal Sent",
    description: "Sent when a proposal is sent to a client",
    suggestedFields: [
      "recipientName",
      "eventName",
      "proposalUrl",
      "totalPrice",
      "companyName",
    ],
  },
  contract_signed: {
    name: "Contract Signed",
    description: "Sent when a client signs a contract",
    suggestedFields: ["recipientName", "eventName", "eventDate", "companyName"],
  },
};

/**
 * Gets list of available notification types
 */
export function getAvailableNotificationTypes(): string[] {
  return Object.keys(EMAIL_NOTIFICATION_TYPES);
}

/**
 * Gets notification type metadata
 */
export function getNotificationTypeMetadata(type: string) {
  return (
    EMAIL_NOTIFICATION_TYPES[type as keyof typeof EMAIL_NOTIFICATION_TYPES] ??
    null
  );
}
