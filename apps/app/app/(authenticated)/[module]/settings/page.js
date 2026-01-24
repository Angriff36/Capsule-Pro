Object.defineProperty(exports, "__esModule", { value: true });
const module_section_1 = require("../../components/module-section");
const ModuleSettingsPage = async ({ params }) => {
  const { module } = await params;
  const label = module
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  return (
    <module_section_1.ModuleSection
      summary={`Module-level settings for ${label}.`}
      title={`${label} Settings`}
    />
  );
};
exports.default = ModuleSettingsPage;
