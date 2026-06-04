import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { AdminTaskFiltersSchema } from "./validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  // Parse and validate query filters
  const filterResult = AdminTaskFiltersSchema.safeParse(
    Object.fromEntries(searchParams.entries())
  );
  if (!filterResult.success) {
    return NextResponse.json(
      {
        message: "Invalid query parameters",
        details: filterResult.error.issues,
      },
      { status: 400 }
    );
  }

  const { status, priority, category, assignedTo, page, limit } =
    filterResult.data;

  // Build where clause with tenant isolation
  const where = {
    AND: [
      { tenantId },
      { deletedAt: null },
      ...(status ? [{ status }] : []),
      ...(priority ? [{ priority }] : []),
      ...(category ? [{ category }] : []),
      ...(assignedTo ? [{ assignedTo }] : []),
    ],
  };

  // Fetch total count and paginated data in parallel
  const [total, tasks] = await Promise.all([
    database.adminTask.count({ where }),
    database.adminTask.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    data: tasks,
    pagination: { page, limit, total, totalPages },
  });
}

/**
 * POST /api/administrative/tasks
 * Create a new admin task via manifest command
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({
    entity: "AdminTask",
    command: "create",
    body: {
      ...rawBody,
      createdBy: user.id,
      status: (rawBody.status as string) || "backlog",
      priority: (rawBody.priority as string) || "medium",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
