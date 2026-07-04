import {
  ArrowRightLeftIcon,
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
        title: "Putaway",
        description:
          "Direct received goods to optimal storage locations by zone and product velocity.",
        href: "/warehouse/putaway",
        actionLabel: "Manage putaway",
        icon: ArrowRightLeftIcon,
      },
      {
        title: "Pick & Pack",
        description:
          "Fulfill orders using FIFO and FEFO picking strategies with packing verification.",
        href: "/warehouse/pick-pack",
        actionLabel: "Pick & pack",
        icon: BoxesIcon,
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
        href: "/inventory/levels",
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
    summary="Receiving, putaway, pick & pack, shipments, cycle counts, and inventory — everything that moves through the warehouse."
    title="Warehouse"
  />
);

export default WarehousePage;
