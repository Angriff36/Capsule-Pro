import { Knock } from "@knocklabs/node";
import { keys } from "./keys";

const key = keys().KNOCK_SECRET_API_KEY;

export const notifications = new Knock(key ? { apiKey: key } : undefined);

// Re-export SMS utilities
export { sendSms } from "./sms";
export {
  sendSmsNotification,
  updateDeliveryStatus,
  getSmsLogs,
  setSmsPreference,
  getSmsPreferences,
  type SendSmsOptions,
  type SendSmsResult,
  type SmsLogEntry,
  type SmsRecipient,
  type SmsStatus,
} from "./sms-notification-service";
export {
  renderSmsTemplate,
  renderSmsTemplateByType,
  validateTemplateData,
  getAvailableTemplateTypes,
  getTemplateMetadata,
  SMS_TEMPLATES,
  type SmsTemplateData,
  type SmsTemplate,
} from "./sms-templates";
