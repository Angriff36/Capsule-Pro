import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/app/lib/cors";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const TEAM_THREAD_SLUG = "team";
const TEAM_THREAD_TYPE = "team";
const DIRECT_THREAD_TYPE = "direct";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ThreadParticipantSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

interface ThreadMessageSummary {
  id: string;
  text: string;
  authorName: string;
  createdAt: Date;
}

interface ThreadSummary {
  id: string;
  type: "team" | "direct";
  title: string;
  lastMessage: ThreadMessageSummary | null;
  lastMessageAt: Date | null;
  archivedAt: Date | null;
  clearedAt: Date | null;
  participant: ThreadParticipantSummary | null;
}

interface ParticipantRow {
  archivedAt: Date | null;
  clearedAt: Date | null;
  thread: {
    id: string;
    threadType: string;
    slug: string | null;
    lastMessageAt: Date | null;
    participants: Array<{
      userId: string;
      user: ThreadParticipantSummary;
    }>;
    messages: ThreadMessageSummary[];
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
  const message = thread.messages[0] ?? null;

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

  const other = thread.participants.find(
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

const getEmployee = async (tenantId: string, authUserId: string) => {
  return await database.user.findFirst({
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
};

const ensureTeamThread = async (tenantId: string, employeeId: string) => {
  const teamThread = await database.adminChatThread.upsert({
    where: {
      tenantId_slug: {
        tenantId,
        slug: TEAM_THREAD_SLUG,
      },
    },
    update: {},
    create: {
      tenantId,
      threadType: TEAM_THREAD_TYPE,
      slug: TEAM_THREAD_SLUG,
      createdBy: employeeId,
    },
  });

  await database.adminChatParticipant.upsert({
    where: {
      tenantId_threadId_userId: {
        tenantId,
        threadId: teamThread.id,
        userId: employeeId,
      },
    },
    update: {
      deletedAt: null,
    },
    create: {
      tenantId,
      threadId: teamThread.id,
      userId: employeeId,
    },
  });

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

    const teamThread = await ensureTeamThread(tenantId, employee.id);

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
            participants: {
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
            messages: {
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
    console.error("Failed to load admin chat threads:", error);
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

    const directKey = buildDirectKey(employee.id, participantId);

    const thread = await database.adminChatThread.upsert({
      where: {
        tenantId_directKey: {
          tenantId,
          directKey,
        },
      },
      update: {},
      create: {
        tenantId,
        threadType: DIRECT_THREAD_TYPE,
        directKey,
        createdBy: employee.id,
      },
    });

    await database.adminChatParticipant.upsert({
      where: {
        tenantId_threadId_userId: {
          tenantId,
          threadId: thread.id,
          userId: employee.id,
        },
      },
      update: {
        deletedAt: null,
      },
      create: {
        tenantId,
        threadId: thread.id,
        userId: employee.id,
      },
    });

    await database.adminChatParticipant.upsert({
      where: {
        tenantId_threadId_userId: {
          tenantId,
          threadId: thread.id,
          userId: participantId,
        },
      },
      update: {
        deletedAt: null,
      },
      create: {
        tenantId,
        threadId: thread.id,
        userId: participantId,
      },
    });

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
            participants: {
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
            messages: {
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
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    console.error("Failed to create direct message thread:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request, "GET, POST, OPTIONS") }
    );
  }
}
