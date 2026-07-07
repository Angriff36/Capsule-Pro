import {
  Car,
  LayoutGrid,
  MapPin,
  Package,
  Route,
  Truck,
  User,
} from "lucide-react";
import { ModuleLanding } from "../../components/module-landing";

const LogisticsPage = () => (
  <ModuleLanding
    eyebrow="Operations / Logistics"
    highlights={[
      {
        title: "Dispatch",
        description:
          "Assign drivers to routes and track today's deliveries from a single board.",
        href: "/logistics/dispatch",
        actionLabel: "Open dispatch",
        icon: LayoutGrid,
      },
      {
        title: "Delivery tracking",
        description:
          "Status, driver assignments, and arrival ETAs for active deliveries.",
        href: "/logistics/tracking",
        actionLabel: "Track deliveries",
        icon: MapPin,
      },
      {
        title: "Shipments",
        description:
          "Inbound and outbound shipments, status, and delivery confirmations.",
        href: "/logistics/shipments",
        actionLabel: "View shipments",
        icon: Package,
      },
      {
        title: "Delivery routes",
        description:
          "Optimize multi-stop delivery routes for catering events and recurring drops.",
        href: "/logistics/routes",
        actionLabel: "Plan routes",
        icon: Route,
      },
      {
        title: "Drivers",
        description:
          "Roster delivery drivers, manage assignments, and check availability.",
        href: "/logistics/drivers",
        actionLabel: "Manage drivers",
        icon: User,
      },
      {
        title: "Vehicles",
        description:
          "Fleet management, maintenance windows, and capacity per vehicle.",
        href: "/logistics/vehicles",
        actionLabel: "View fleet",
        icon: Car,
      },
      {
        title: "Inventory transfers",
        description:
          "Move stock between locations and venues with auditable transfers.",
        href: "/inventory/levels",
        actionLabel: "Transfer stock",
        icon: Truck,
      },
    ]}
    summary="Deliveries, shipments, routes, drivers, and vehicles — coordinated for catering operations."
    title="Logistics"
  />
);

export default LogisticsPage;
