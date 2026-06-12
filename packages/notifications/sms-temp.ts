/**
 * SMS Notification Provider
 *
 * Provider interface for sending SMS notifications.
 * Implements with Twilio. Swap providers by changing the implementation.
 *
 * Usage from send-notification.ts:
 *   import { sendSMS } from "@repo/notifications";
 *   await sendSMS({ to: "+1234567890", message: "Hello" });
 */

import { keys } from "./keys";

// ─── Provider Interface ───────────────────────────────────────────────────

export interface SmsProvider {
  /** Provider name for logging/tracking. */
  readonly name: string;
  /** Send a single SMS message. Returns the provider message ID on success. */
  send(to: string, message: string): Promise<string>;
}

// ─── E.164 Validation ─────────────────────────────────────────────────────

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

function normalizePhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();
  if (!E164_REGEX.test(trimmed)) {
    throw new Error(
      `Invalid phone number: ${phoneNumber}. Must be in E.164 format (e.g., +1234567890)`
    );
  }
  return trimmed;
}

// ─── Twilio Provider ──────────────────────────────────────────────────────

class TwilioProvider implements SmsProvider {
  readonly name = "twilio";

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async send(to: string, message: string): Promise<string> {
    const normalizedPhone = normalizePhoneNumber(to);

    const twilio = await import("twilio");
    const client = twilio.default(this.accountSid, this.authToken);

    const result = await client.messages.create({
      body: message,
      from: this.fromNumber,
      to: normalizedPhone,
    });

    return result.sid;
  }
}

// ─── No-op Provider (fallback when credentials missing) ───────────────────

class NoOpProvider implements SmsProvider {
  readonly name = "noop";

  async send(_to: string, _message: string): Promise<string> {
    console.warn(
      "[SMS] No-op provider: SMS not sent. Configure TWILIO credentials."
    );
    return `noop-${Date.now()}`;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

let cachedProvider: SmsProvider | null = null;

function getProvider(): SmsProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const env = keys();
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    cachedProvider = new TwilioProvider(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_PHONE_NUMBER
    );
  } else {
    cachedProvider = new NoOpProvider();
  }

  return cachedProvider;
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface SendSMSParams {
  /** Message body (max 1600 chars for Twilio) */
  message: string;
  /** Recipient phone number in E.164 format */
  to: string;
}

export interface SendSMSResult {
  /** Provider message ID (e.g. Twilio SID) */
  messageId: string;
  /** Which provider was used */
  provider: string;
  /** Whether the message was actually sent (false for noop) */
  sent: boolean;
}

/**
 * Send an SMS notification.
 *
 * Returns a result object with the provider message ID and provider name.
 * Falls back to a no-op provider if Twilio credentials are not configured.
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const provider = getProvider();
  const messageId = await provider.send(params.to, params.message);
  const sent = provider.name !== "noop";

  return { messageId, provider: provider.name, sent };
}

/**
 * Reset the cached provider. Useful for testing or after env changes.
 */
export function resetSmsProvider(): void {
  cachedProvider = null;
}
