import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/app/lib/cors";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const TEAM_THREAD_SLUG = "team";
const TEAM_THREAD_TYPE = "team";
const DIRECT_THREAD_TYPE = "direct";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ThreadParticipantSummary {
  avatarUrl: string | null;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
}

interface ThreadMessageSummary {
  authorName: string;
  createdAt: Date;
  id: string;
  text: string;
}

interface ThreadSummary {
  archivedAt: Date | null;
  clearedAt: Date | null;
  id: string;
  lastMessage: ThreadMessageSummary | null;
  lastMessageAt: Date | null;
  participant: ThreadParticipantSummary | null;
  title: string;
  type: "team" | "direct";
}

interface ParticipantRow {
  archivedAt: Date | null;
  clearedAt: Date | null;
  thread: {
    id: string;
    threadType: string;
    slug: string | null;
    lastMessageAt: Date | null;
    adminChatParticipants: Array<{
      userId: string;
      user: ThreadParticipantSummary;
    }>;
    adminChatMessages: ThreadMessageSummary[];
  };
}

const buildDirectKey = (left: string, right: string) =>
  [left, right].sort().join(":");

const formatDisplayName = (employee: {
  firstName: string;
  lastName: string;
  email: string;
}) => {
  const first = employee.firstName.trim();
  const last = employee.lastName.trim();
  return `${first} ${last}`.trim() || employee.email;
};

const toThreadSummary = (
  row: ParticipantRow,
  currentUserId: string
): ThreadSummary => {
  const { thread } = row;
  const isTeam = thread.threadType === TEAM_THREAD_TYPE;
  const message = thread.adminChatMessages[0] ?? null;

  if (isTeam) {
    return {
      id: thread.id,
      type: "team",
      title: "Team thread",
      lastMessage: message,
      lastMessageAt: thread.lastMessageAt ?? message?.createdAt ?? null,
      archivedAt: row.archivedAt,
      clearedAt: row.clearedAt,
      participant: null,
    };
  }

  const other = thread.adminChatParticipants.find(
    (participant) => participant.userId !== currentUserId
  );

  const participant = other?.user ?? null;

  return {
    id: thread.id,
    type: "direct",
    title: participant
      ? formatDisplayName({
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
        })
      : "Direct message",
    lastMessage: message,
    lastMessageAt: thread.lastMessageAt ?? message?.createdAt ?? null,
    archivedAt: row.archivedAt,
    clearedAt: row.clearedAt,
    participant,
  };
};

const getEmployee = async (tenantId: string, authUserId: string) =>
  await database.user.findFirst({
    where: {
      tenantId,
      authUserId,
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

/**
 * Ensures the team thread and current user's participant exist.
 * Uses Manifest commands for writes; direct reads per constitution §10.
 */
const ensureTeamThread = async (
  tenantId: string,
  employeeId: string,
  user: {
    id: string;
    tenantId: string;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
  }
) => {
  // Read: check if team thread already exists (read per constitution §10)
  let teamThread = await database.adminChatThread.findFirst({
    where: {
      tenantId,
      slug: TEAM_THREAD_SLUG,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!teamThread) {
    // Write: create team thread via Manifest
    const threadResult = await runManifestCommand({
      entity: "AdminChatThread",
      command: "create",
      body: {
        threadType: TEAM_THREAD_TYPE,
        slug: TEAM_THREAD_SLUG,
        directKey: "",
        createdBy: employeeId,
      },
      user,
    });

    if (threadResult.status !== 200 && threadResult.status !== 201) {
      throw new Error("Failed to create team thread");
    }

    // Re-read to get the created thread (read per constitution §10)
    teamThread = await database.adminChatThread.findFirst({
      where: {
        tenantId,
        slug: TEAM_THREAD_SLUG,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!teamThread) {
      throw new Error("Team thread not found after creation");
    }
  }

  // Read: check if participant exists (read per constitution §10)
  const existingParticipant = await database.adminChatParticipant.findFirst({
    where: {
      tenantId,
      threadId: teamThread.id,
      userId: employeeId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!existingParticipant) {
    // Write: create participant via Manifest
    await runManifestCommand({
      entity: "AdminChatParticipant",
      command: "create",
      body: {
        threadId: teamThread.id,
        userId: employeeId,
      },
      user,
    });
  }

  return teamThread;
};

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request, "GET, POST, OPTIONS"),
  });
}

export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const employee = await getEmployee(tenantId, userId);

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const user = await resolveCurrentUser(request);
    const teamThread = await ensureTeamThread(tenantId, employee.id, user);

    const participantRows = await database.adminChatParticipant.findMany({
      where: {
        tenantId,
        userId: employee.id,
        deletedAt: null,
        thread: {
          deletedAt: null,
        },
      },
      select: {
        archivedAt: true,
        clearedAt: true,
        thread: {
          select: {
            id: true,
            threadType: true,
            slug: true,
            lastMessageAt: true,
            adminChatParticipants: {
              where: {
                deletedAt: null,
              },
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            adminChatMessages: {
              where: {
                deletedAt: null,
              },
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                text: true,
                authorName: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const summaries = participantRows.map((row) =>
      toThreadSummary(row, employee.id)
    );

    const team = summaries.find((summary) => summary.type === "team") ?? null;
    const direct = summaries
      .filter((summary) => summary.type === "direct")
      .sort((left, right) => {
        const leftTime = left.lastMessageAt?.getTime() ?? 0;
        const rightTime = right.lastMessageAt?.getTime() ?? 0;
        return rightTime - leftTime;
      });

    return NextResponse.json(
      {
        threads: team ? [team, ...direct] : direct,
        teamThreadId: team?.id ?? teamThread.id,
      },
      {
        headers: corsHeaders(request, "GET, POST, OPTIONS"),
      }
    );
  } catch (error) {
    captureException(error);
    log.error("Failed to load admin chat threads:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request, "GET, POST, OPTIONS") }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const employee = await getEmployee(tenantId, userId);

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      participantId?: string;
    } | null;

    const participantId = body?.participantId?.trim() ?? "";
    invariant(participantId, "participantId is required");
    invariant(UUID_REGEX.test(participantId), "participantId must be a UUID");
    invariant(
      participantId !== employee.id,
      "participantId must be another employee"
    );

    const participantEmployee = await database.user.findFirst({
      where: {
        tenantId,
        id: participantId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
      },
    });

    if (!participantEmployee) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const user = await resolveCurrentUser(request);
    const directKey = buildDirectKey(employee.id, participantId);

    // Read: check if thread already exists (read per constitution §10)
    let thread = await database.adminChatThread.findFirst({
      where: {
        tenantId,
        directKey,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!thread) {
      // Write: create direct thread via Manifest
      const threadResult = await runManifestCommand({
        entity: "AdminChatThread",
        command: "create",
        body: {
          threadType: DIRECT_THREAD_TYPE,
          slug: "",
          directKey,
          createdBy: employee.id,
        },
        user,
      });

      if (threadResult.status !== 200 && threadResult.status !== 201) {
        return threadResult;
      }

      // Re-read to get the created thread (read per constitution §10)
      thread = await database.adminChatThread.findFirst({
        where: {
          tenantId,
          directKey,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!thread) {
        return NextResponse.json(
          { message: "Failed to create thread" },
          { status: 500, headers: corsHeaders(request, "GET, POST, OPTIONS") }
        );
      }
    }

    // Ensure both participants exist via Manifest
    // Read: check current user's participant (read per constitution §10)
    const existingSelfParticipant =
      await database.adminChatParticipant.findFirst({
        where: {
          tenantId,
          threadId: thread.id,
          userId: employee.id,
          deletedAt: null,
        },
        select: { id: true },
      });

    if (!existingSelfParticipant) {
      await runManifestCommand({
        entity: "AdminChatParticipant",
        command: "create",
        body: {
          threadId: thread.id,
          userId: employee.id,
        },
        user,
      });
    }

    // Read: check other participant (read per constitution §10)
    const existingOtherParticipant =
      await database.adminChatParticipant.findFirst({
        where: {
          tenantId,
          threadId: thread.id,
          userId: participantId,
          deletedAt: null,
        },
        select: { id: true, archivedAt: true },
      });

    if (!existingOtherParticipant) {
      await runManifestCommand({
        entity: "AdminChatParticipant",
        command: "create",
        body: {
          threadId: thread.id,
          userId: participantId,
        },
        user,
      });
    } else if (existingOtherParticipant.archivedAt) {
      // If the other participant was archived, unarchive them
      await runManifestCommand({
        entity: "AdminChatParticipant",
        command: "unarchive",
        body: {
          id: existingOtherParticipant.id,
          threadId: thread.id,
        },
        user,
      });
    }

    // Read: fetch the full participant row for response (read per constitution §10)
    const participantRow = await database.adminChatParticipant.findFirst({
      where: {
        tenantId,
        userId: employee.id,
        threadId: thread.id,
        deletedAt: null,
      },
      select: {
        archivedAt: true,
        clearedAt: true,
        thread: {
          select: {
            id: true,
            threadType: true,
            slug: true,
            lastMessageAt: true,
            adminChatParticipants: {
              where: {
                deletedAt: null,
              },
              select: {
                userId: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            adminChatMessages: {
              where: {
                deletedAt: null,
              },
              take: 1,
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                text: true,
                authorName: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!participantRow) {
      return NextResponse.json(
        { message: "Thread not available" },
        { status: 404, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const summary = toThreadSummary(participantRow, employee.id);

    return NextResponse.json(summary, {
      status: 201,
      headers: corsHeaders(request, "GET, POST, OPTIONS"),
    });
  } catch (error) {
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    log.error("Failed to create direct message thread:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request, "GET, POST, OPTIONS") }
    );
  }
}
