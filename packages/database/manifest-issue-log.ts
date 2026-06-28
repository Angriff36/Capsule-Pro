import { logManifestIssue } from "@repo/observability/manifest-issue-log"
import type { PrismaClient } from "./generated/client";

function summarizeArgs(args: unknown): unknown {
  if (!args || typeof args !== "object") {
    return args;
  }

  const record = args as Record<string, unknown>;
  const data = record.data;

  if (Array.isArray(data)) {
    return { ...record, data: `[${data.length} rows]` };
  }

  if (data && typeof data === "object") {
    return {
      ...record,
      data: Object.keys(data as Record<string, unknown>),
    };
  }

  return record;
}

/** Dev-only Prisma extension — logs query failures to manifest issue log. */
export function withManifestIssueLog(client: PrismaClient): PrismaClient {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.MANIFEST_ISSUE_LOG === "0"
  ) {
    return client;
  }

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          try {
            return await query(args);
          } catch (error) {
            const prismaCode =
              error &&
              typeof error === "object" &&
              "code" in error &&
              typeof (error as { code: unknown }).code === "string"
                ? (error as { code: string }).code
                : undefined;
            const prismaMeta =
              error &&
              typeof error === "object" &&
              "meta" in error &&
              typeof (error as { meta: unknown }).meta === "object"
                ? ((error as { meta: Record<string, unknown> }).meta ?? {})
                : {};

            logManifestIssue({
              kind: "prisma_error",
              entity: model,
              source: "database",
              message: error instanceof Error ? error.message : String(error),
              details: {
                operation,
                prismaCode,
                column: prismaMeta.column_name ?? prismaMeta.column,
                args: summarizeArgs(args),
                stack: error instanceof Error ? error.stack : undefined,
              },
            });
            throw error;
          }
        },
      },
    },
  }) as unknown as PrismaClient;
}
