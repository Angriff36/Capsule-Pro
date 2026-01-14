import { ModuleLanding } from "../components/module-landing";

const WarehousePage = () => (
  <ModuleLanding
    title="Warehouse"
    summary="Coordinate receiving, storage, and outbound flows for event production."
    highlights={[
      "Inbound receiving and quality checks.",
      "Outbound shipment preparation and tracking.",
      "Audits tied to inventory variance.",
    ]}
  />
);

export default WarehousePage;
