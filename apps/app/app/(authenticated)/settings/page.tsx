import { ModuleLanding } from "../components/module-landing";

const SettingsPage = () => (
  <ModuleLanding
    title="Settings"
    summary="Manage organization preferences, integrations, and access controls."
    highlights={[
      "Team roles and access permissions.",
      "Integration settings for third-party services.",
      "Security and compliance configuration.",
    ]}
  />
);

export default SettingsPage;
