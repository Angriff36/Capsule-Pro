import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

// Column statuses MUST match the AdminTask state machine
// (manifest/source/core/admin-task-rules.manifest): backlog / in_progress /
// review / done (+ cancelled, never shown as a column). The legacy "todo"
// status no longer exists.
const DEFAULT_COLUMNS = [
  { status: "backlog", title: "Backlog", color: "neutral", wipLimit: 0 },
  {
    status: "in_progress",
    title: "In Progress",
    color: "amber",
    wipLimit: 5,
  },
  { status: "review", title: "Review", color: "purple", wipLimit: 3 },
  { status: "done", title: "Done", color: "green", wipLimit: 0 },
];

/**
 * GET /api/administrative/board-config
 *
 * Read-only: returns the tenant's board config, or an unpersisted default
 * (id: "") when none exists. GET must not write — creating a real config row
 * is the governed POST (BoardConfig.create). This mirrors the kanban page's
 * server-side fallback (apps/app .../kanban/page.tsx).
 */
export async function GET(_request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const config = await database.boardConfig.findFirst({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!config) {
    return NextResponse.json({
      data: {
        id: "",
        name: "Default Board",
        columns: DEFAULT_COLUMNS,
        settings: {},
      },
    });
  }

  return NextResponse.json({ data: config });
}

/**
 * POST /api/administrative/board-config
 * Create the board config via the governed BoardConfig.create command.
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runCommand({
    entity: "BoardConfig",
    command: "create",
    body: {
      name: (rawBody.name as string) || "Default Board",
      columns: rawBody.columns ?? DEFAULT_COLUMNS,
      settings: rawBody.settings ?? {},
      createdBy: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
