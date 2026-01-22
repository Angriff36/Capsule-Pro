import { ModuleLanding } from "../components/module-landing";

const CrmPage = () => (
  <ModuleLanding
    highlights={[
      "Centralized client profiles and event history.",
      "Venue details with constraints and logistics notes.",
      "Outbound communication logs and follow-ups.",
    ]}
    summary="Manage client relationships, venues, and communications in one timeline."
    title="CRM"
  />
);

export default CrmPage;
