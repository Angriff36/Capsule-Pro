import { EmailTemplatesClient } from "./components/email-templates-client";

export default function EmailTemplatesPage() {
  return <EmailTemplatesClient />;
}

export const metadata = {
  title: "Email Templates",
  description: "Create and manage branded email templates for proposals, confirmations, reminders, and follow-ups.",
};
