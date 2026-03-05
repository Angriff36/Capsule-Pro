/**
 * Communication Preferences Types
 *
 * Types for per-client communication preferences including channels,
 * frequency, timing, and content types with global opt-out management
 * and preference inheritance.
 */

/**
 * Communication channel types
 */
export type CommunicationChannel = "email" | "sms" | "phone" | "mail";

/**
 * Communication frequency options
 */
export type CommunicationFrequency =
  | "immediate"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "never";

/**
 * Content types that can be communicated
 */
export type CommunicationContentType =
  | "marketing"
  | "promotions"
  | "updates"
  | "reminders"
  | "invoices"
  | "proposals"
  | "events"
  | "surveys"
  | "newsletters"
  | "alerts";

/**
 * Time of day for communication preferences
 */
export interface TimePreference {
  enabled: boolean;
  start?: string; // HH:mm format, e.g., "09:00"
  end?: string; // HH:mm format, e.g., "17:00"
  timezone?: string; // IANA timezone, e.g., "America/New_York"
}

/**
 * Day of week preferences
 */
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/**
 * Channel-specific communication preferences
 */
export interface ChannelPreferences {
  enabled: boolean;
  frequency: CommunicationFrequency;
  contentTypes: CommunicationContentType[];
  timing?: TimePreference;
  allowedDays?: DayOfWeek[];
}

/**
 * Global communication preferences
 */
export interface GlobalCommunicationPreferences {
  optOut: boolean; // Master opt-out for all communications
  optOutAt?: string; // ISO timestamp when opt-out occurred
  preferredChannels?: CommunicationChannel[]; // Ordered by preference
}

/**
 * Complete communication preferences structure
 * Stored as JSON in ClientPreference.preferenceValue with preferenceType="communication"
 */
export interface CommunicationPreferences {
  global: GlobalCommunicationPreferences;
  email: ChannelPreferences;
  sms: ChannelPreferences;
  phone: ChannelPreferences;
  mail: ChannelPreferences;
  notes?: string;
}

/**
 * Default communication preferences
 */
export const defaultCommunicationPreferences: CommunicationPreferences = {
  global: {
    optOut: false,
    preferredChannels: ["email", "sms"],
  },
  email: {
    enabled: true,
    frequency: "daily",
    contentTypes: ["invoices", "proposals", "events", "reminders"],
    timing: {
      enabled: true,
      start: "09:00",
      end: "17:00",
      timezone: "America/New_York",
    },
    allowedDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  },
  sms: {
    enabled: true,
    frequency: "immediate",
    contentTypes: ["reminders", "alerts"],
    timing: {
      enabled: true,
      start: "08:00",
      end: "20:00",
    },
    allowedDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  },
  phone: {
    enabled: true,
    frequency: "weekly",
    contentTypes: ["proposals", "events"],
    timing: {
      enabled: true,
      start: "10:00",
      end: "16:00",
    },
    allowedDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  },
  mail: {
    enabled: false,
    frequency: "monthly",
    contentTypes: ["marketing", "promotions"],
    timing: {
      enabled: false,
    },
  },
};

/**
 * Preference keys for ClientPreference records
 */
export const COMMUNICATION_PREFERENCE_KEYS = {
  FULL: "communication.full", // Complete preferences object
  GLOBAL_OPT_OUT: "communication.global.optOut",
  EMAIL_ENABLED: "communication.email.enabled",
  EMAIL_FREQUENCY: "communication.email.frequency",
  EMAIL_TYPES: "communication.email.contentTypes",
  SMS_ENABLED: "communication.sms.enabled",
  SMS_FREQUENCY: "communication.sms.frequency",
  PHONE_ENABLED: "communication.phone.enabled",
  PHONE_FREQUENCY: "communication.phone.frequency",
  MAIL_ENABLED: "communication.mail.enabled",
  PREFERRED_CHANNELS: "communication.global.preferredChannels",
} as const;

/**
 * Helper to check if a channel is enabled respecting global opt-out
 */
export function isChannelEnabled(
  preferences: CommunicationPreferences,
  channel: CommunicationChannel
): boolean {
  if (preferences.global.optOut) return false;
  return preferences[channel].enabled;
}

/**
 * Helper to check if content type is allowed for a channel
 */
export function isContentTypeAllowed(
  preferences: CommunicationPreferences,
  channel: CommunicationChannel,
  contentType: CommunicationContentType
): boolean {
  if (!isChannelEnabled(preferences, channel)) return false;
  return preferences[channel].contentTypes.includes(contentType);
}

/**
 * Helper to get the best channel for a content type
 */
export function getPreferredChannelForContentType(
  preferences: CommunicationPreferences,
  contentType: CommunicationContentType
): CommunicationChannel | null {
  if (preferences.global.optOut) return null;

  // Check preferred channels in order
  for (const channel of preferences.global.preferredChannels || []) {
    if (isContentTypeAllowed(preferences, channel, contentType)) {
      return channel;
    }
  }

  // Fall back to checking all channels
  for (const channel of ["email", "sms", "phone", "mail"] as const) {
    if (isContentTypeAllowed(preferences, channel, contentType)) {
      return channel;
    }
  }

  return null;
}
