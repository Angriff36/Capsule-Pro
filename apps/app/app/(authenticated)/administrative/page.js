Object.defineProperty(exports, "__esModule", { value: true });
const module_landing_1 = require("../components/module-landing");
const AdministrativePage = () => (
  <module_landing_1.ModuleLanding
    highlights={[
      "Management boards for event and kitchen status.",
      "Cross-team chat and updates in one place.",
      "Kanban workflows for operational follow-through.",
    ]}
    summary="Executive oversight across events, kitchen, and delivery operations."
    title="Administrative"
  />
);
exports.default = AdministrativePage;
