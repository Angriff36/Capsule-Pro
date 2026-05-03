import {
  BoxesIcon,
  ClipboardListIcon,
  PackagePlusIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";
import { ModuleLanding } from "../components/module-landing";

const WarehousePage = () => (
  <ModuleLanding
    eyebrow="Operations / Warehouse"
    highlights={[
      {
        title: "Receiving",
        description:
          "Receive incoming stock, match against purchase orders, and verify quantities.",
        href: "/warehouse/receiving",
        actionLabel: "Receive stock",
        icon: PackagePlusIcon,
      },
      {
        title: "Shipments",
        description:
          "Track inbound and outbound shipments, delivery status, and proof of delivery.",
        href: "/warehouse/shipments",
        actionLabel: "View shipments",
        icon: TruckIcon,
      },
      {
        title: "Cycle counts",
        description:
          "Schedule and execute cycle counts, track variance, and reconcile inventory.",
        href: "/warehouse/audits",
        actionLabel: "Start count",
        icon: ClipboardListIcon,
      },
      {
        title: "Inventory",
        description:
          "Browse warehouse inventory, stock levels, reorder points, and item details.",
        href: "/warehouse/inventory",
        actionLabel: "Browse items",
        icon: BoxesIcon,
      },
      {
        title: "All stock items",
        description:
          "Full inventory catalog across all locations with filtering and search.",
        href: "/inventory/items",
        actionLabel: "View catalog",
        icon: WarehouseIcon,
      },
    ]}
    summary="Receiving, shipments, cycle counts, and inventory — everything that moves through the warehouse."
    title="Warehouse"
  />
);

export default WarehousePage;
