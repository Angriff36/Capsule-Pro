import { Knock } from "@knocklabs/node";
import { keys } from "./keys";

const key = keys().KNOCK_SECRET_API_KEY;

export const notifications = new Knock(key ? { apiKey: key } : undefined);

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
