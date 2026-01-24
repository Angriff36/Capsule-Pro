Object.defineProperty(exports, "__esModule", { value: true });
const module_landing_1 = require("../components/module-landing");
const WarehousePage = () => (
  <module_landing_1.ModuleLanding
    highlights={[
      "Inbound receiving and quality checks.",
      "Outbound shipment preparation and tracking.",
      "Audits tied to inventory variance.",
    ]}
    summary="Coordinate receiving, storage, and outbound flows for event production."
    title="Warehouse"
  />
);
exports.default = WarehousePage;
