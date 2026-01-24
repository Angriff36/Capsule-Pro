var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPTIONS = OPTIONS;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const ably_1 = __importDefault(require("ably"));
const server_2 = require("next/server");
const env_1 = require("@/env");
const getClientId = (tenantId, userId) => `tenant:${tenantId}:user:${userId}`;
// Get allowed origins from environment or default to common dev ports
const getAllowedOrigins = () => {
  const allowedOrigins = env_1.env.ABLY_AUTH_CORS_ORIGINS?.split(",").map((o) =>
    o.trim()
  );
  return (
    allowedOrigins || [
      "http://localhost:2221",
      "http://localhost:2222",
      "http://localhost:3000",
      "http://127.0.0.1:2221",
      "http://127.0.0.1:2222",
      "http://127.0.0.1:3000",
    ]
  );
};
function corsHeaders(request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  // Allow request origin if it matches or default to first allowed origin
  const allowedOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}
function OPTIONS(request) {
  return new server_2.NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}
async function POST(request) {
  // Validate Clerk authentication first
  const { userId, sessionClaims } = await (0, server_1.auth)();
  if (!userId) {
    return new server_2.NextResponse("Unauthorized", {
      status: 401,
      headers: corsHeaders(request),
    });
  }
  // Get tenantId from Clerk session claims (or request body as fallback)
  const requestBody = await request.json().catch(() => null);
  const tenantId = requestBody?.tenantId || sessionClaims?.tenantId;
  if (!tenantId) {
    return new server_2.NextResponse("tenantId required", {
      status: 400,
      headers: corsHeaders(request),
    });
  }
  const clientId = getClientId(tenantId, userId);
  const channel = `tenant:${tenantId}`;
  const ably = new ably_1.default.Rest(env_1.env.ABLY_API_KEY);
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId,
    capability: { [channel]: ["subscribe"] },
  });
  return server_2.NextResponse.json(tokenRequest, {
    headers: corsHeaders(request),
  });
}
