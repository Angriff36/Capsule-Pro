import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  MCP_SERVER_MODE: z.enum(["tenant", "admin"]).default("tenant"),
  MCP_SERVICE_ACCOUNT_ID: z.string().optional(),
  MCP_SERVICE_TENANT_ID: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  MCP_PROJECT_ROOT: z.string().optional(),
  MCP_ALLOW_DB: z.string().optional(),
  REPO_ROOT: z.string().optional(),
});

export type McpEnv = z.infer<typeof envSchema>;

export function keys(): McpEnv {
  return envSchema.parse(process.env);
}
