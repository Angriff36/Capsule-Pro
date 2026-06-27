import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/app/lib/cors";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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

const getEmployee = async (tenantId: string, authUserId: string) =>
  await database.user.findFirst({
    where: {
      tenantId,
      authUserId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

/**
 * Ensures a participant exists for a team thread using Manifest commands.
 * For team threads, auto-join is allowed; for direct threads, the participant
 * must already exist. Returns the participant record (read per constitution §10).
 */
const ensureTeamThreadParticipant = async (options: {
  tenantId: string;
  threadId: string;
  userId: string;
  user: {
    id: string;
    tenantId: string;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}) => {
  // Read: check if participant exists (read per constitution §10)
  const existing = await database.adminChatParticipant.findFirst({
    where: {
      tenantId: options.tenantId,
      threadId: options.threadId,
      userId: options.userId,
      deletedAt: null,
    },
    select: {
      id: true,
      archivedAt: true,
      clearedAt: true,
    },
  });

  if (existing) {
    return existing;
  }

  // Write: create participant via Manifest
  await runManifestCommand({
    entity: "AdminChatParticipant",
    command: "create",
    body: {
      threadId: options.threadId,
      userId: options.userId,
    },
    user: options.user,
  });

  // Re-read to get the created record (read per constitution §10)
  return await database.adminChatParticipant.findFirst({
    where: {
      tenantId: options.tenantId,
      threadId: options.threadId,
      userId: options.userId,
      deletedAt: null,
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
        const user = await resolveCurrentUser(request);
        const ensured = await ensureTeamThreadParticipant({
          tenantId,
          threadId,
          userId: employee.id,
          user,
        });
        if (!ensured) {
          return NextResponse.json(
            { message: "Failed to ensure participant" },
            { status: 500, headers: corsHeaders(request, "PATCH, OPTIONS") }
          );
        }
        participant = ensured!;
      } else {
        return NextResponse.json(
          { message: "Thread not found" },
          { status: 404, headers: corsHeaders(request, "PATCH, OPTIONS") }
        );
      }
    }

    // At this point participant is guaranteed non-null — either it existed
    // or we ensured it (returning early on failure above).
    const activeParticipant = participant!;

    const body = (await request.json().catch(() => null)) as {
      action?: string;
    } | null;

    const action = body?.action ?? "";
    invariant(
      ["archive", "unarchive", "clear"].includes(action),
      "action must be archive, unarchive, or clear"
    );

    // Map action to Manifest command
    const commandMap: Record<string, string> = {
      archive: "archive",
      unarchive: "unarchive",
      clear: "clearHistory",
    };
    const command = commandMap[action];
    invariant(command, "unsupported action");

    const user = await resolveCurrentUser(request);
    const result = await runManifestCommand({
      entity: "AdminChatParticipant",
      command,
      body: {
        id: activeParticipant.id,
        threadId,
      },
      user,
    });

    if (result.status !== 200) {
      return result;
    }

    // Re-read participant to return fresh state (read per constitution §10)
    const updated = await database.adminChatParticipant.findFirst({
      where: {
        tenantId,
        id: activeParticipant.id,
        deletedAt: null,
      },
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
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400, headers: corsHeaders(request, "PATCH, OPTIONS") }
      );
    }
    log.error("Failed to update admin chat thread:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request, "PATCH, OPTIONS") }
    );
  }
}
