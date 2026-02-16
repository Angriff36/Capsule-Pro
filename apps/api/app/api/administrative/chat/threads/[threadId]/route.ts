import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/app/lib/cors";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const TEAM_THREAD_TYPE = "team";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request, "PATCH, OPTIONS"),
  });
}

const getEmployee = async (tenantId: string, authUserId: string) => {
  return await database.user.findFirst({
    where: {
      tenantId,
      authUserId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
};

const ensureParticipant = async (options: {
  tenantId: string;
  threadId: string;
  userId: string;
}) => {
  return await database.adminChatParticipant.upsert({
    where: {
      tenantId_threadId_userId: {
        tenantId: options.tenantId,
        threadId: options.threadId,
        userId: options.userId,
      },
    },
    update: {
      deletedAt: null,
    },
    create: {
      tenantId: options.tenantId,
      threadId: options.threadId,
      userId: options.userId,
    },
    select: {
      id: true,
      archivedAt: true,
      clearedAt: true,
    },
  });
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: corsHeaders(request, "PATCH, OPTIONS") }
      );
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const employee = await getEmployee(tenantId, userId);

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404, headers: corsHeaders(request, "PATCH, OPTIONS") }
      );
    }

    const { threadId } = await context.params;
    invariant(threadId, "threadId is required");
    invariant(UUID_REGEX.test(threadId), "threadId must be a UUID");

    const thread = await database.adminChatThread.findFirst({
      where: {
        tenantId,
        id: threadId,
        deletedAt: null,
      },
      select: {
        id: true,
        threadType: true,
      },
    });

    if (!thread) {
      return NextResponse.json(
        { message: "Thread not found" },
        { status: 404, headers: corsHeaders(request, "PATCH, OPTIONS") }
      );
    }

    let participant = await database.adminChatParticipant.findFirst({
      where: {
        tenantId,
        threadId,
        userId: employee.id,
        deletedAt: null,
      },
      select: {
        id: true,
        archivedAt: true,
        clearedAt: true,
      },
    });

    if (!participant) {
      if (thread.threadType === TEAM_THREAD_TYPE) {
        participant = await ensureParticipant({
          tenantId,
          threadId,
          userId: employee.id,
        });
      } else {
        return NextResponse.json(
          { message: "Thread not found" },
          { status: 404, headers: corsHeaders(request, "PATCH, OPTIONS") }
        );
      }
    }

    const body = (await request.json().catch(() => null)) as {
      action?: string;
    } | null;

    const action = body?.action ?? "";
    invariant(
      ["archive", "unarchive", "clear"].includes(action),
      "action must be archive, unarchive, or clear"
    );

    const now = new Date();
    let data: { archivedAt: Date } | { archivedAt: null } | { clearedAt: Date };
    if (action === "archive") {
      data = { archivedAt: now };
    } else if (action === "unarchive") {
      data = { archivedAt: null };
    } else {
      data = { clearedAt: now };
    }

    const updated = await database.adminChatParticipant.update({
      where: {
        tenantId_id: {
          tenantId,
          id: participant.id,
        },
      },
      data,
      select: {
        id: true,
        archivedAt: true,
        clearedAt: true,
      },
    });

    return NextResponse.json(updated, {
      headers: corsHeaders(request, "PATCH, OPTIONS"),
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400, headers: corsHeaders(request, "PATCH, OPTIONS") }
      );
    }
    console.error("Failed to update admin chat thread:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request, "PATCH, OPTIONS") }
    );
  }
}
