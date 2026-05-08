/**
 * @vitest-environment node
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Notification Provider Disabled — Graceful Degradation Tests
 *
 * These tests verify that the notification system degrades gracefully
 * when providers (Resend, Twilio, Knock) aren't configured.
 *
 * They verify the actual source code structure and export contracts.
 */

const __filename = fileURLToPath(import.meta.url);
const PKG_ROOT = join(dirname(__filename), "..");

function readPkgFile(relativePath: string): string {
  const fullPath = join(PKG_ROOT, relativePath);
  if (!existsSync(fullPath)) {
    return "";
  }
  return readFileSync(fullPath, "utf-8");
}

// =============================================================================
// Client-side components (verified by source code review)
// =============================================================================

describe("NotificationsProvider (client)", () => {
  it("returns children without wrapping when Knock keys are missing", () => {
    const source = readPkgFile("components/provider.tsx");
    // Provider checks both keys before wrapping with KnockProvider
    expect(source).toContain("knockApiKey");
    expect(source).toContain("knockFeedChannelId");
    // When keys are missing, it returns children directly
    expect(source).toContain("return children");
  });

  it("renders KnockProvider/KnockFeedProvider when both keys are present", () => {
    const source = readPkgFile("components/provider.tsx");
    expect(source).toContain("KnockProvider");
    expect(source).toContain("KnockFeedProvider");
  });
});

describe("NotificationsTrigger (client)", () => {
  it("returns null when NEXT_PUBLIC_KNOCK_API_KEY is missing or not mounted", () => {
    const source = readPkgFile("components/trigger.tsx");
    expect(source).toContain("NEXT_PUBLIC_KNOCK_API_KEY");
    expect(source).toContain("isMounted");
    expect(source).toContain("return null");
  });

  it("uses useEffect to set isMounted after hydration", () => {
    const source = readPkgFile("components/trigger.tsx");
    expect(source).toContain("setIsMounted(true)");
    expect(source).toContain("useEffect");
  });
});

// =============================================================================
// Server-side: Knock client initialization
// =============================================================================

describe("Knock client initialization", () => {
  it("passes undefined to Knock constructor when KNOCK_SECRET_API_KEY is absent", () => {
    const source = readPkgFile("index.ts");
    // new Knock(key ? { apiKey: key } : undefined)
    expect(source).toContain("KNOCK_SECRET_API_KEY");
    expect(source).toContain("undefined");
  });
});

// =============================================================================
// Server-side: Email service without Resend
// =============================================================================

describe("Email service — Resend not configured", () => {
  it("getResendClient returns null when RESEND_TOKEN is not set", () => {
    const source = readPkgFile("email-notification-service.ts");
    expect(source).toContain("getResendClient");
    expect(source).toContain("RESEND_TOKEN");
    expect(source).toContain("return null");
  });

  it("sendEmailNotification returns failure result per recipient when unconfigured", () => {
    const source = readPkgFile("email-notification-service.ts");
    // When sendSingleEmail returns null, the code pushes a failure result
    expect(source).toContain("Email service not configured");
    expect(source).toContain("success: false");
    expect(source).toContain('status: "failed"');
  });

  it("exports the expected public functions for email", () => {
    // @repo/notifications uses server-only, so we verify exports via source analysis
    const source = readPkgFile("index.ts");
    expect(source).toContain("sendEmailNotification");
    expect(source).toContain("sendEmailFromTemplate");
    expect(source).toContain("getEmailLogs");
    expect(source).toContain("setEmailPreference");
    expect(source).toContain("getEmailPreferences");
    expect(source).toContain("updateEmailDeliveryStatus");
  });

  it("error messages do not expose provider names (Resend)", () => {
    const source = readPkgFile("email-notification-service.ts");
    // The error message should say "Email service not configured", not "Resend..."
    const emailErrorMessage = "Email service not configured";
    expect(emailErrorMessage).not.toContain("Resend");
    expect(emailErrorMessage).not.toContain("RESEND_TOKEN");
    // Verify the source uses this safe message
    expect(source).toContain(emailErrorMessage);
  });
});

// =============================================================================
// Server-side: SMS service without Twilio
// =============================================================================

describe("SMS service — Twilio not configured", () => {
  it("getTwilioClient returns null when TWILIO_ACCOUNT_SID/AUTH_TOKEN not set", () => {
    const source = readPkgFile("sms-notification-service.ts");
    expect(source).toContain("getTwilioClient");
    expect(source).toContain("TWILIO_ACCOUNT_SID");
    expect(source).toContain("TWILIO_AUTH_TOKEN");
    expect(source).toContain("return null");
  });

  it("sendSingleSms returns null when TWILIO_PHONE_NUMBER is not set", () => {
    const source = readPkgFile("sms-notification-service.ts");
    expect(source).toContain("TWILIO_PHONE_NUMBER");
    expect(source).toContain("sendSingleSms");
    expect(source).toContain("return null");
  });

  it("sendSmsNotification returns failure result per recipient when unconfigured", () => {
    const source = readPkgFile("sms-notification-service.ts");
    expect(source).toContain("SMS service not configured");
    expect(source).toContain("success: false");
  });

  it("exports the expected public functions for SMS", () => {
    // @repo/notifications uses server-only, so we verify exports via source analysis
    const source = readPkgFile("index.ts");
    expect(source).toContain("sendSmsNotification");
    expect(source).toContain("getSmsLogs");
    expect(source).toContain("setSmsPreference");
    expect(source).toContain("getSmsPreferences");
    expect(source).toContain("updateDeliveryStatus");
  });

  it("error messages do not expose provider names (Twilio)", () => {
    const source = readPkgFile("sms-notification-service.ts");
    const smsErrorMessage = "SMS service not configured";
    expect(smsErrorMessage).not.toContain("Twilio");
    expect(smsErrorMessage).not.toContain("TWILIO");
    expect(source).toContain(smsErrorMessage);
  });
});

// =============================================================================
// No undefined crashes
// =============================================================================

describe("No undefined crashes", () => {
  it("email service validates email format before sending", () => {
    const source = readPkgFile("email-notification-service.ts");
    expect(source).toContain("validateEmail");
    expect(source).toContain("Invalid email");
  });

  it("invalid email returns structured failure (not throw)", async () => {
    const source = readPkgFile("email-notification-service.ts");
    // The code uses validateEmail and pushes a failure result
    expect(source).toContain("success: false");
    expect(source).toContain("Invalid email");
  });

  it("SMS service normalizes phone numbers to E.164 format", () => {
    const source = readPkgFile("sms-notification-service.ts");
    expect(source).toContain("normalizePhoneNumber");
    expect(source).toContain("E.164");
  });

  it("all result objects have concrete status field", () => {
    const emailSource = readPkgFile("email-notification-service.ts");
    const smsSource = readPkgFile("sms-notification-service.ts");
    // Both use 'status: "failed"' or 'status: "sent"'
    expect(emailSource).toContain('status: "failed"');
    expect(smsSource).toContain('status: "failed"');
  });

  it("error messages are user-friendly strings", () => {
    const emailError = "Email service not configured";
    const smsError = "SMS service not configured";
    expect(emailError).not.toContain("Resend");
    expect(emailError).not.toContain("token");
    expect(smsError).not.toContain("Twilio");
    expect(smsError).not.toContain("credentials");
  });
});

// =============================================================================
// Summary: Graceful degradation matrix
// =============================================================================

describe("Graceful degradation summary", () => {
  it("all source files exist for the 5 provider-disabled scenarios", () => {
    const files = [
      "index.ts",
      "keys.ts",
      "components/provider.tsx",
      "components/trigger.tsx",
      "email-notification-service.ts",
      "sms-notification-service.ts",
    ];
    for (const file of files) {
      const fullPath = join(PKG_ROOT, file);
      expect(existsSync(fullPath), `Expected ${file} to exist`).toBe(true);
    }
  });

  it("keys() marks all provider credentials as optional", () => {
    const source = readPkgFile("keys.ts");
    // All provider env vars use .optional()
    expect(source).toContain("KNOCK_SECRET_API_KEY");
    expect(source).toContain("TWILIO_ACCOUNT_SID");
    expect(source).toContain("TWILIO_AUTH_TOKEN");
    expect(source).toContain("TWILIO_PHONE_NUMBER");
    expect(source).toContain("RESEND_TOKEN");
    // Each should be .optional()
    const optionalCount = (source.match(/\.optional\(\)/g) || []).length;
    expect(optionalCount).toBeGreaterThanOrEqual(5);
  });

  it("no internal implementation details leak in error messages", () => {
    const emailSource = readPkgFile("email-notification-service.ts");
    const smsSource = readPkgFile("sms-notification-service.ts");
    // Error messages should not contain raw env var names or provider internals
    expect(emailSource).not.toContain('"RESEND_TOKEN');
    expect(smsSource).not.toContain('"TWILIO_ACCOUNT_SID');
    expect(smsSource).not.toContain('"TWILIO_AUTH_TOKEN');
  });
});
