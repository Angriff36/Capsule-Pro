import { ModuleLanding } from "../components/module-landing";

const SchedulingPage = () => (
  <ModuleLanding
    title="Scheduling"
    summary="Plan shifts, manage availability, and coordinate staff assignments."
    highlights={[
      "Shift planning tied to event demand.",
      "Availability and time-off requests.",
      "Coverage alerts for critical roles.",
    ]}
  />
);

export default SchedulingPage;
