import { Knock } from "@knocklabs/node";
import { keys } from "./keys";

const key = keys().KNOCK_SECRET_API_KEY;

export const notifications = new Knock(key ? { apiKey: key } : undefined);

// Re-export Email utilities
export {
  type EmailLogEntry,
  type EmailRecipient,
  type EmailStatus,
  getEmailLogs,
  getEmailPreferences,
  type SendEmailOptions,
  type SendEmailResult,
  sendEmailFromTemplate,
  sendEmailNotification,
  setEmailPreference,
  updateEmailDeliveryStatus,
} from "./email-notification-service";
export {
  COMMON_MERGE_FIELDS,
  EMAIL_NOTIFICATION_TYPES,
  type EmailTemplateData,
  extractMergeFields,
  getAvailableNotificationTypes,
  getMergeFieldDescription,
  getNotificationTypeMetadata,
  renderEmailTemplate,
  validateTemplateData as validateEmailTemplateData,
} from "./email-templates";
// Re-export Email Workflow Triggers
export {
  buildContractRecipients,
  buildContractTemplateData,
  buildEventRecipients,
  buildEventTemplateData,
  buildTaskRecipients,
  buildTaskTemplateData,
  triggerEmailWorkflows,
  type WorkflowTriggerContext,
} from "./email-workflow-triggers";
// Re-export Outbound Webhook utilities
export {
  buildWebhookPayload,
  calculateRetryDelay,
  determineNextStatus,
  generateSignature,
  type OutboundWebhookType,
  sendWebhook,
  shouldAutoDisable,
  shouldTriggerWebhook,
  type WebhookConfig,
  type WebhookDeliveryLogType,
  type WebhookDeliveryResult,
  type WebhookPayload,
} from "./outbound-webhook-service";
// Re-export SMS utilities
export { sendSms } from "./sms";
export {
  getSmsLogs,
  getSmsPreferences,
  type SendSmsOptions,
  type SendSmsResult,
  type SmsLogEntry,
  type SmsRecipient,
  type SmsStatus,
  sendSmsNotification,
  setSmsPreference,
  updateDeliveryStatus,
} from "./sms-notification-service";
export {
  getAvailableTemplateTypes,
  getTemplateMetadata,
  renderSmsTemplate,
  renderSmsTemplateByType,
  SMS_TEMPLATES,
  type SmsTemplate,
  type SmsTemplateData,
  validateTemplateData,
} from "./sms-templates";
