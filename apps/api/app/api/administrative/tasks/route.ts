import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { AdminTaskFiltersSchema, CreateAdminTaskSchema } from "./validation";

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

export async function POST(request: Request) {
  const { orgId, userId: clerkId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const body = await request.json();
  const parseResult = CreateAdminTaskSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { message: "Invalid request body", details: parseResult.error.issues },
      { status: 400 }
    );
  }

  const { dueDate, ...rest } = parseResult.data;

  // Resolve createdBy from Clerk user ID
  let createdBy: string | undefined;
  if (clerkId) {
    const user = await database.user.findFirst({
      where: { AND: [{ tenantId }, { authUserId: clerkId }] },
      select: { id: true },
    });
    createdBy = user?.id;
  }

  const task = await database.adminTask.create({
    data: {
      tenantId,
      ...rest,
      ...(dueDate ? { dueDate } : {}),
      ...(createdBy ? { createdBy } : {}),
    },
  });

  return NextResponse.json({ data: task }, { status: 201 });
}
