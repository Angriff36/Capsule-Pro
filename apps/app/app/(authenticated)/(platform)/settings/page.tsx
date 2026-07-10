import { ModuleLanding } from "../../components/module-landing";
import { SampleDataPanel } from "./sample-data-panel";

const SettingsPage = () => (
  <div>
    <ModuleLanding
      highlights={[
        "Team roles and access permissions.",
        "Integration settings for third-party services.",
        "Security and compliance configuration.",
        "Audit log for tracking changes.",
        {
          title: "Webhooks",
          description:
            "Configure outbound webhooks to push real-time events to external services.",
          href: "/settings/webhooks",
          actionLabel: "Manage",
        },
      ]}
      summary="Manage organization preferences, integrations, and access controls."
      title="Settings"
    />
    <div className="mx-auto max-w-5xl px-6 pb-12">
      <SampleDataPanel />
    </div>
  </div>
);

export default SettingsPage;
