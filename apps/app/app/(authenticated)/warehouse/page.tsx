import { ModuleLanding } from "../components/module-landing";

const WarehousePage = () => (
  <ModuleLanding
    highlights={[
      "Inbound receiving and quality checks.",
      "Outbound shipment preparation and tracking.",
      "Audits tied to inventory variance.",
    ]}
    summary="Coordinate receiving, storage, and outbound flows for event production."
    title="Warehouse"
  />
);

export default WarehousePage;
