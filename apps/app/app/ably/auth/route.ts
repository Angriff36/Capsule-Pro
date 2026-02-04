import { auth } from "@repo/auth/server";
import Ably from "ably";
import { NextResponse } from "next/server";

type AuthRequest = {
  tenantId: string;
};

const getClientId = (tenantId: string, userId: string) =>
  `tenant:${tenantId}:user:${userId}`;

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
  const channel = `tenant:${tenantId}`;
  const ably = new Ably.Rest(apiKey);

  let tokenRequest;
  try {
    tokenRequest = await ably.auth.createTokenRequest({
      clientId,
      capability: { [channel]: ["subscribe"] },
    });
  } catch (error) {
    const code = (error as { code?: number } | null)?.code;
    if (code !== 40_160) {
      throw error;
    }
    // Fallback to key capability when channel-specific capability isn't allowed.
    tokenRequest = await ably.auth.createTokenRequest({ clientId });
  }

  return NextResponse.json(tokenRequest);
}
