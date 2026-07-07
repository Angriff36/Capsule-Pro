import { BarChart3, Mail, MessageSquare, Users } from "lucide-react";
import { ModuleLanding } from "../../components/module-landing";

const MarketingPage = () => (
  <ModuleLanding
    eyebrow="Operations / Marketing"
    highlights={[
      {
        title: "Leads",
        description:
          "Track and qualify inbound leads from events, referrals, and outreach.",
        href: "/marketing/leads",
        actionLabel: "Manage leads",
        icon: Users,
      },
      {
        title: "Email workflows",
        description:
          "Automated email sequences for client onboarding, event follow-ups, and nurture campaigns.",
        href: "/marketing/email-workflows",
        actionLabel: "Manage workflows",
        icon: Mail,
      },
      {
        title: "Analytics",
        description:
          "Campaign performance, open rates, click-through rates, and conversion metrics.",
        href: "/marketing/analytics",
        actionLabel: "View analytics",
        icon: BarChart3,
      },
      {
        title: "SMS automation",
        description:
          "Event reminders, delivery notifications, and follow-up text messages.",
        href: "/marketing/sms-rules",
        actionLabel: "Manage rules",
        icon: MessageSquare,
      },
    ]}
    summary="Campaigns, leads, email workflows, and analytics — drive growth across every channel."
    title="Marketing"
  />
);

export default MarketingPage;
