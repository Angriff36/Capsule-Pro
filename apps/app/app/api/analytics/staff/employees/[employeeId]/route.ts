import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await getTenantIdForOrg(orgId);

  const { employeeId } = await params;

  try {
    const { getEmployeePerformance } = await import(
      "../../../../../(authenticated)/analytics/staff/actions/get-employee-performance"
    );
    const metrics = await getEmployeePerformance(employeeId);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching employee performance:", error);
    return NextResponse.json(
      { message: "Failed to fetch employee performance" },
      { status: 500 }
    );
  }
}
