import type { Metadata } from "next";
import { EventIntakeClient } from "./intake-client";

export const metadata: Metadata = {
  title: "Event Intake | Capsule Pro",
  description: "Submit a new event inquiry and get a personalized catering estimate.",
};

export default function EventIntakePage() {
  return <EventIntakeClient />;
}
