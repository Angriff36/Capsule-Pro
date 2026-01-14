import Ably from "ably";
import { env } from "@/env";

type AuthRequest = {
  tenantId: string;
  userId?: string;
};

const getClientId = (tenantId: string, userId?: string) =>
  userId ? `tenant:${tenantId}:user:${userId}` : `tenant:${tenantId}`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AuthRequest | null;
  if (!body?.tenantId) {
    return new Response("tenantId required", { status: 400 });
  }

  const clientId = getClientId(body.tenantId, body.userId);
  const channel = `tenant:${body.tenantId}`;
  const ably = new Ably.Rest(env.ABLY_API_KEY);

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId,
    capability: { [channel]: ["subscribe"] },
  });

  return Response.json(tokenRequest);
}
