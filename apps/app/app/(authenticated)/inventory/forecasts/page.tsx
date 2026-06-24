"use client";

import dynamic from "next/dynamic";
import { OperationalPageSkeleton } from "../../components/operational-page-shell";

const ForecastsPageClient = dynamic(
  () =>
    import("./forecasts-page-client").then((mod) => ({
      default: mod.ForecastsPageClient,
    })),
  {
    ssr: false,
    loading: () => <OperationalPageSkeleton />,
  }
);

const ForecastsPage = () => <ForecastsPageClient />;

export default ForecastsPage;
