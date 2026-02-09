import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import Ably from "ably";
import { NextResponse } from "next/server";

interface AuthRequest {
  tenantId: string;
}

const getClientId = (tenantId: string, userId: string) =>
  `tenant:${tenantId}:user:${userId}`;
const teamChannelForTenant = (tenantId: string) =>
  `tenant:${tenantId}:admin-chat`;
const directChannelForThread = (tenantId: string, threadId: string) =>
  `tenant:${tenantId}:admin-chat:thread:${threadId}`;

export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const requestBody = (await request
    .json()
    .catch(() => null)) as AuthRequest | null;
  const tenantId =
    requestBody?.tenantId || (sessionClaims?.tenantId as string | undefined);

  if (!tenantId) {
    return new NextResponse("tenantId required", { status: 400 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return new NextResponse("Ably API key not configured.", { status: 500 });
  }

  const clientId = getClientId(tenantId, userId);
  const channel = teamChannelForTenant(tenantId);
  const ably = new Ably.Rest({ key: apiKey });
  const employee = await database.user.findFirst({
    where: {
      tenantId,
      authUserId: userId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!employee) {
    return new NextResponse("Employee not found", { status: 404 });
  }

  const directThreads = await database.adminChatParticipant.findMany({
    where: {
      tenantId,
      userId: employee.id,
      deletedAt: null,
      thread: {
        deletedAt: null,
        threadType: "direct",
      },
    },
    select: {
      threadId: true,
    },
  });

  const capability: Record<string, string[]> = {
    [channel]: ["publish", "subscribe"],
  };

  for (const thread of directThreads) {
    capability[directChannelForThread(tenantId, thread.threadId)] = [
      "publish",
      "subscribe",
    ];
  }

  let tokenRequest;
  try {
    tokenRequest = await ably.auth.createTokenRequest({
      clientId,
      capability: capability as Ably.TokenParams["capability"],
    });
  } catch (error) {
    const code = (error as { code?: number } | null)?.code;
    if (code !== 40_160) {
      throw error;
    }
    tokenRequest = await ably.auth.createTokenRequest({ clientId });
  }

  return NextResponse.json(tokenRequest);
}
