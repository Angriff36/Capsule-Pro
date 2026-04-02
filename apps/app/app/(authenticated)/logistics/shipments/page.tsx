import { Metadata } from "next";
import { ShipmentsClient } from "./shipments-client";

export const metadata: Metadata = {
  title: "Shipments",
  description: "Track and manage shipments",
};

export default function ShipmentsPage() {
  return <ShipmentsClient />;
}
