import { env } from "@/env";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:2221",
  "http://localhost:2222",
  "http://localhost:3000",
  "http://127.0.0.1:2221",
  "http://127.0.0.1:2222",
  "http://127.0.0.1:3000",
];

const getAllowedOrigins = () => {
  const allowedOrigins = env.REALTIME_CORS_ORIGINS?.split(",").map(
    (value: string) => value.trim()
  );
  return allowedOrigins?.length ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;
};

export const corsHeaders = (
  request: Request,
  methods: string
): Record<string, string> => {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  if (!(origin && allowedOrigins.includes(origin))) {
    return {
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
};
