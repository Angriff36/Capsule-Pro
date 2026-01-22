import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(request: Request) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await getTenantIdForOrg(orgId);

  try {
    const { getEmployeePerformanceSummary } = await import(
      "../../../../(authenticated)/analytics/staff/actions/get-employee-performance"
    );
    const summary = await getEmployeePerformanceSummary();

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching employee performance summary:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee performance summary" },
      { status: 500 }
    );
  }
}
