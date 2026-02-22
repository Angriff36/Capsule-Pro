import { VenuesClient } from "./components/venues-client";

export default function CrmVenuesPage() {
  return <VenuesClient />;
}

export const metadata = {
  title: "Venues",
  description:
    "Manage venues, capacity, and coordination notes for every site.",
};
