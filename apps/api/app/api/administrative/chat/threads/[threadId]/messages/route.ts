import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import Ably from "ably";
import { NextResponse } from "next/server";
import { corsHeaders } from "@/app/lib/cors";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { env } from "@/env";

export const runtime = "nodejs";

const TEAM_THREAD_TYPE = "team";
const MESSAGE_EVENT = "admin.chat.message";
const MAX_MESSAGE_LENGTH = 4000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

const parseLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

const parseBefore = (value: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const channelNameForThread = (
  tenantId: string,
  threadId: string,
  type: string
) =>
  type === TEAM_THREAD_TYPE
    ? `tenant:${tenantId}:admin-chat`
    : `tenant:${tenantId}:admin-chat:thread:${threadId}`;

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
      clearedAt: true,
      archivedAt: true,
    },
  });
};

const resolveThreadAccess = async (options: {
  tenantId: string;
  threadId: string;
  userId: string;
}) => {
  const thread = await database.adminChatThread.findFirst({
    where: {
      tenantId: options.tenantId,
      id: options.threadId,
      deletedAt: null,
    },
    select: {
      id: true,
      threadType: true,
    },
  });

  if (!thread) {
    return null;
  }

  const participant = await database.adminChatParticipant.findFirst({
    where: {
      tenantId: options.tenantId,
      threadId: options.threadId,
      userId: options.userId,
      deletedAt: null,
    },
    select: {
      id: true,
      clearedAt: true,
      archivedAt: true,
    },
  });

  if (participant) {
    return { thread, participant };
  }

  if (thread.threadType === TEAM_THREAD_TYPE) {
    const created = await ensureParticipant(options);
    return { thread, participant: created };
  }

  return null;
};

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request, "GET, POST, OPTIONS"),
  });
}

export async function GET(request: Request, context: RouteContext) {
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

    const { threadId } = await context.params;
    invariant(threadId, "threadId is required");
    invariant(UUID_REGEX.test(threadId), "threadId must be a UUID");

    const access = await resolveThreadAccess({
      tenantId,
      threadId,
      userId: employee.id,
    });

    if (!access) {
      return NextResponse.json(
        { message: "Thread not found" },
        { status: 404, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const before = parseBefore(searchParams.get("before"));

    const whereCreatedAt = {
      ...(before ? { lt: before } : {}),
      ...(access.participant.clearedAt
        ? { gt: access.participant.clearedAt }
        : {}),
    };

    const messages = await database.adminChatMessage.findMany({
      where: {
        tenantId,
        threadId,
        deletedAt: null,
        createdAt: whereCreatedAt,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        id: true,
        text: true,
        authorId: true,
        authorName: true,
        createdAt: true,
      },
    });

    const ordered = messages.slice().reverse();
    const nextBefore =
      ordered.length === limit ? ordered[0]?.createdAt.toISOString() : null;

    return NextResponse.json(
      {
        messages: ordered,
        hasMore: ordered.length === limit,
        nextBefore,
      },
      {
        headers: corsHeaders(request, "GET, POST, OPTIONS"),
      }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }
    console.error("Failed to fetch admin chat messages:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request, "GET, POST, OPTIONS") }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
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

    const { threadId } = await context.params;
    invariant(threadId, "threadId is required");
    invariant(UUID_REGEX.test(threadId), "threadId must be a UUID");

    const access = await resolveThreadAccess({
      tenantId,
      threadId,
      userId: employee.id,
    });

    if (!access) {
      return NextResponse.json(
        { message: "Thread not found" },
        { status: 404, headers: corsHeaders(request, "GET, POST, OPTIONS") }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      text?: string;
    } | null;

    const text = body?.text?.trim() ?? "";
    invariant(text, "Message text is required");
    invariant(
      text.length <= MAX_MESSAGE_LENGTH,
      `Message text must be under ${MAX_MESSAGE_LENGTH} characters`
    );

    const authorName =
      `${employee.firstName.trim()} ${employee.lastName.trim()}`
        .trim()
        .trim() || employee.email;

    const message = await database.adminChatMessage.create({
      data: {
        tenantId,
        threadId,
        authorId: employee.id,
        authorName,
        text,
      },
      select: {
        id: true,
        text: true,
        authorId: true,
        authorName: true,
        createdAt: true,
      },
    });

    await database.adminChatThread.update({
      where: {
        tenantId_id: {
          tenantId,
          id: threadId,
        },
      },
      data: {
        lastMessageAt: message.createdAt,
      },
    });

    const ably = new Ably.Rest({ key: env.ABLY_API_KEY });
    const channelName = channelNameForThread(
      tenantId,
      threadId,
      access.thread.threadType
    );

    try {
      await ably.channels.get(channelName).publish(MESSAGE_EVENT, {
        id: message.id,
        threadId,
        text: message.text,
        authorId: message.authorId,
        authorName: message.authorName,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (publishError) {
      console.error("Failed to publish admin chat message:", publishError);
    }

    return NextResponse.json(message, {
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
    console.error("Failed to send admin chat message:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500, headers: corsHeaders(request, "GET, POST, OPTIONS") }
    );
  }
}
