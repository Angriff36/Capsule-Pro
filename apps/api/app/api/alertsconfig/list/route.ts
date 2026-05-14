import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Math.min(Number(searchParams.get("limit") ?? "25"), 100);
  const channel = searchParams.get("channel");
  const search = searchParams.get("search");

  const where = {
    tenantId,
    ...(channel && channel !== "all" ? { channel } : {}),
    ...(search
      ? {
          OR: [
            { channel: { contains: search, mode: "insensitive" as const } },
            {
              destination: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [configs, total] = await Promise.all([
    database.alertsConfig.findMany({
      where,
      orderBy: { channel: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    database.alertsConfig.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return manifestSuccessResponse({
    data: configs.map((c) => ({
      id: c.id,
      channel: c.channel,
      destination: c.destination,
    })),
    pagination: { page, limit, total, totalPages },
  });
}
