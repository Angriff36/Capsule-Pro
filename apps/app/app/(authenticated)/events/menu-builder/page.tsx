import type { Metadata } from "next";
import { MenuBuilderClient } from "./menu-builder-client";

export const metadata: Metadata = {
  title: "Menu Builder | Capsule Pro",
  description:
    "Build a custom menu from the seasonal catalog. Filter by dietary needs, preview, and export.",
};

export default function MenuBuilderPage() {
  return <MenuBuilderClient />;
}
