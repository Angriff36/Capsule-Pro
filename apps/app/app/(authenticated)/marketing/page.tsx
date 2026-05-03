import { BarChart3, Mail, Megaphone, MessageSquare, Users } from "lucide-react";
import { ModuleLanding } from "../components/module-landing";

const MarketingPage = () => (
  <ModuleLanding
    eyebrow="Operations / Marketing"
    highlights={[
      {
        title: "Campaigns",
        description:
          "Create and manage multi-channel marketing campaigns with performance tracking.",
        href: "/marketing/campaigns",
        actionLabel: "View campaigns",
        icon: Megaphone,
      },
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
        href: "/settings/email-workflows",
        actionLabel: "Set up workflows",
        icon: Mail,
      },
      {
        title: "Analytics",
        description:
          "Campaign performance, open rates, click-through rates, and conversion metrics.",
        href: "/analytics/sales",
        actionLabel: "View analytics",
        icon: BarChart3,
      },
      {
        title: "SMS automation",
        description:
          "Event reminders, delivery notifications, and follow-up text messages.",
        href: "/marketing",
        actionLabel: "Coming soon",
        icon: MessageSquare,
      },
    ]}
    summary="Campaigns, leads, email workflows, and analytics — drive growth across every channel."
    title="Marketing"
  />
);

export default MarketingPage;
