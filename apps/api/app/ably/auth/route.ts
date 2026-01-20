import Ably from "ably";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/env";
import { NextResponse } from "next/server";

type AuthRequest = {
  tenantId: string;
};

const getClientId = (tenantId: string, userId: string) =>
  `tenant:${tenantId}:user:${userId}`;

// Get allowed origins from environment or default to common dev ports
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = env.ABLY_AUTH_CORS_ORIGINS?.split(",").map((o) => o.trim());
  return allowedOrigins || [
    "http://localhost:2221",
    "http://localhost:2222",
    "http://localhost:3000",
    "http://127.0.0.1:2221",
    "http://127.0.0.1:2222",
    "http://127.0.0.1:3000",
  ];
};

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  // Allow request origin if it matches or default to first allowed origin
  const allowedOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: Request) {
  // Validate Clerk authentication first
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: corsHeaders(request),
    });
  }

  // Get tenantId from Clerk session claims (or request body as fallback)
  const requestBody = await request.json().catch(() => null) as AuthRequest | null;
  const tenantId = requestBody?.tenantId || sessionClaims?.tenantId as string | undefined;

  if (!tenantId) {
    return new NextResponse("tenantId required", {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  const clientId = getClientId(tenantId, userId);
  const channel = `tenant:${tenantId}`;
  const ably = new Ably.Rest(env.ABLY_API_KEY);

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId,
    capability: { [channel]: ["subscribe"] },
  });

  return NextResponse.json(tokenRequest, {
    headers: corsHeaders(request),
  });
}
