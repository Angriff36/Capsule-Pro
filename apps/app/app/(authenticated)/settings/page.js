Object.defineProperty(exports, "__esModule", { value: true });
const module_landing_1 = require("../components/module-landing");
const SettingsPage = () => (
  <module_landing_1.ModuleLanding
    highlights={[
      "Team roles and access permissions.",
      "Integration settings for third-party services.",
      "Security and compliance configuration.",
    ]}
    summary="Manage organization preferences, integrations, and access controls."
    title="Settings"
  />
);
exports.default = SettingsPage;
