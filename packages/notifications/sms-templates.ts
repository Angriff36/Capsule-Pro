/**
 * SMS Template Utility with Merge Fields
 *
 * Supports template strings with {{field}} placeholders that are replaced
 * with actual values at render time.
 */

export interface SmsTemplateData {
  [key: string]: string | number | undefined;
}

export interface SmsTemplate {
  type: string;
  template: string;
  description: string;
}

/**
 * Predefined SMS templates for common notification types
 */
export const SMS_TEMPLATES: Record<string, SmsTemplate> = {
  urgent_update: {
    type: "urgent_update",
    template: "URGENT: {{message}} - {{companyName}}",
    description: "Urgent operational updates requiring immediate attention",
  },
  shift_reminder: {
    type: "shift_reminder",
    template:
      "Shift Reminder: {{shiftDate}} at {{shiftTime}}. Location: {{location}}. {{companyName}}",
    description: "Reminder for upcoming shifts",
  },
  shift_assignment: {
    type: "shift_assignment",
    template:
      "New Shift Assigned: {{shiftDate}} at {{shiftTime}}. Location: {{location}}. Reply STOP to opt out. {{companyName}}",
    description: "Notification for new shift assignments",
  },
  task_assignment: {
    type: "task_assignment",
    template:
      "New Task: {{taskName}} due {{dueDate}}. Priority: {{priority}}. {{companyName}}",
    description: "Notification for task assignments",
  },
  task_reminder: {
    type: "task_reminder",
    template:
      "Task Reminder: {{taskName}} is due {{dueDate}}. {{companyName}}",
    description: "Reminder for upcoming task deadlines",
  },
  clock_in_reminder: {
    type: "clock_in_reminder",
    template:
      "Reminder: Please clock in for your shift at {{location}}. {{companyName}}",
    description: "Reminder to clock in for scheduled shifts",
  },
  schedule_change: {
    type: "schedule_change",
    template:
      "Schedule Change: {{changeDetails}}. Check your schedule for updates. {{companyName}}",
    description: "Notification for schedule modifications",
  },
};

/**
 * Renders a template string by replacing {{field}} placeholders with actual values
 */
export function renderSmsTemplate(
  template: string,
  data: SmsTemplateData
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
 * Gets a template by type and renders it with the provided data
 */
export function renderSmsTemplateByType(
  type: string,
  data: SmsTemplateData
): string {
  const template = SMS_TEMPLATES[type];

  if (!template) {
    throw new Error(`Unknown SMS template type: ${type}`);
  }

  return renderSmsTemplate(template.template, data);
}

/**
 * Validates that all required placeholders in a template have values
 */
export function validateTemplateData(
  template: string,
  data: SmsTemplateData
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
 * Gets list of available template types
 */
export function getAvailableTemplateTypes(): string[] {
  return Object.keys(SMS_TEMPLATES);
}

/**
 * Gets template metadata by type
 */
export function getTemplateMetadata(type: string): SmsTemplate | null {
  return SMS_TEMPLATES[type] ?? null;
}
