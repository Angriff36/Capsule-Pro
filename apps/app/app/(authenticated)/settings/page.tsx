import { ModuleLanding } from "../components/module-landing";

const SettingsPage = () => (
  <ModuleLanding
    highlights={[
      "Team roles and access permissions.",
      "Integration settings for third-party services.",
      "Security and compliance configuration.",
    ]}
    summary="Manage organization preferences, integrations, and access controls."
    title="Settings"
  />
);

export default SettingsPage;
