import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

const DEFAULT_COLUMNS = [
  { status: "backlog", title: "Backlog", color: "neutral", wipLimit: 0 },
  { status: "todo", title: "To Do", color: "blue", wipLimit: 0 },
  {
    status: "in_progress",
    title: "In Progress",
    color: "amber",
    wipLimit: 5,
  },
  { status: "review", title: "Review", color: "purple", wipLimit: 3 },
  { status: "done", title: "Done", color: "green", wipLimit: 0 },
];

export async function GET(_request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  let config = await database.boardConfig.findFirst({
    where: { tenantId },
  });

  if (!config) {
    config = await database.boardConfig.create({
      data: {
        tenantId,
        columns: DEFAULT_COLUMNS,
      },
    });
  }

  return NextResponse.json({ data: config });
}

export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "BoardConfig",
    commandName: "create",
    transformBody: (body) => ({
      ...body,
      columns: body.columns || DEFAULT_COLUMNS,
    }),
  });
}
