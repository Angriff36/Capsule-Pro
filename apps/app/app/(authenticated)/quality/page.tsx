import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import QualityDashboardClient from "./quality-dashboard-client";

const QualityDashboardPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/sign-in");
  }

  // Fetch initial metrics server-side
  const metricsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/quality/metrics?period=30&includeTrends=true`,
    {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        cookie: "",
      },
    }
  );

  const initialData = await metricsResponse
    .json()
    .catch(() => ({ data: null }));

  return (
    <QualityDashboardClient initialData={initialData.data} orgId={orgId} />
  );
};

export default QualityDashboardPage;
