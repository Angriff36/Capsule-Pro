import { keys } from "./keys";

// E.164 phone validation: must start with + and contain 1-15 digits
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

function normalizePhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();

  if (E164_REGEX.test(trimmed) === false) {
    throw new Error(
      "Invalid phone number: " +
        phoneNumber +
        ". Must be in E.164 format (e.g., +1234567890)"
    );
  }

  return trimmed;
}

export async function sendSms(to: string, message: string): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(to);

  const env = keys();
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const fromNumber = env.TWILIO_PHONE_NUMBER;

  if (accountSid === false || authToken === false || fromNumber === false) {
    throw new Error("Twilio credentials not configured");
  }

  const twilio = await import("twilio");
  const client = twilio(accountSid, authToken);

  try {
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: normalizedPhone,
    });
  } catch (error) {
    throw new Error(
      "Failed to send SMS to " +
        normalizedPhone +
        ": " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}
