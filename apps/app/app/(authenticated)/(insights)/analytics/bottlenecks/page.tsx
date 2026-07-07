import BottlenecksPageClient from "./bottlenecks-page-client";

export const metadata = {
  title: "Operational Bottlenecks",
  description:
    "Detect operational bottlenecks and review improvement suggestions",
};

export default function BottlenecksPage() {
  return <BottlenecksPageClient />;
}
