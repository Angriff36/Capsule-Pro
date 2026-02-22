/**
 * Email Template Utilities
 *
 * Client-side utilities for email template operations
 */

import type { email_templates } from "@repo/database";

/**
 * Render a template with merge field values
 * Replaces {{field}} placeholders with actual values
 */
export function renderTemplate(
  template: Pick<email_templates, "subject" | "body">,
  values: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  }

  return { subject, body };
}

/**
 * Extract merge field names from template content
 */
export function extractMergeFields(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const fields: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (!fields.includes(match[1])) {
      fields.push(match[1]);
    }
  }

  return fields;
}

/**
 * Common merge fields available for email templates
 */
export const COMMON_MERGE_FIELDS = [
  { name: "recipientName", description: "Recipient's full name" },
  { name: "recipientFirstName", description: "Recipient's first name" },
  { name: "recipientEmail", description: "Recipient's email address" },
  { name: "senderName", description: "Sender's full name" },
  { name: "companyName", description: "Company/organization name" },
  { name: "eventName", description: "Event name" },
  { name: "eventDate", description: "Event date" },
  { name: "eventTime", description: "Event time" },
  { name: "eventLocation", description: "Event location/venue" },
  { name: "proposalTitle", description: "Proposal title" },
  { name: "proposalUrl", description: "Link to view proposal" },
  { name: "totalAmount", description: "Total amount" },
  { name: "contractUrl", description: "Link to sign contract" },
  { name: "message", description: "Custom message" },
] as const;
