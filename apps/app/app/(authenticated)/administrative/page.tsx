import { ModuleLanding } from "../components/module-landing";

const AdministrativePage = () => (
  <ModuleLanding
    title="Administrative"
    summary="Executive oversight across events, kitchen, and delivery operations."
    highlights={[
      "Management boards for event and kitchen status.",
      "Cross-team chat and updates in one place.",
      "Kanban workflows for operational follow-through.",
    ]}
  />
);

export default AdministrativePage;
