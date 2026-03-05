import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const widgetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["kpi", "line", "bar", "table"]),
  title: z.string().min(1),
  metric: z.string().min(1),
  chartType: z.enum(["number", "line", "bar", "table", "area", "pie"]),
});

const scheduleSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  dayOfWeek: z.string().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  timezone: z.string().default("America/New_York"),
});

const distributionSchema = z.object({
  channels: z.array(z.enum(["email", "slack", "webhook"])).min(1),
  recipients: z.array(z.string().trim()).default([]),
  webhookUrl: z.string().url().optional(),
});

const customReportSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  templateId: z.string().optional(),
  dataSource: z.enum(["events", "finance", "kitchen", "staff", "inventory"]),
  widgets: z.array(widgetSchema).min(1),
  layout: z
    .object({
      columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
      gap: z.enum(["sm", "md", "lg"]).default("md"),
    })
    .default({ columns: 2, gap: "md" }),
  filters: z.record(z.string(), z.unknown()).default({}),
  schedule: scheduleSchema,
  distribution: distributionSchema,
});

export async function GET() {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const reports = await database.report.findMany({
      where: { tenantId, deletedAt: null, reportType: "custom" },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      reports: reports.map((report) => {
        const queryConfig =
          typeof report.query_config === "object" && report.query_config
            ? (report.query_config as Record<string, unknown>)
            : {};
        const distribution =
          typeof queryConfig.distribution === "object" &&
          queryConfig.distribution
            ? (queryConfig.distribution as Record<string, unknown>)
            : {};
        const channels = Array.isArray(distribution.channels)
          ? distribution.channels.map((value) => String(value))
          : [];
        const scheduleEnabled =
          typeof queryConfig.schedule === "object" &&
          queryConfig.schedule &&
          Boolean((queryConfig.schedule as Record<string, unknown>).enabled);

        return {
          id: report.id,
          name: report.name,
          description: report.description,
          updatedAt: report.updatedAt,
          scheduleEnabled,
          channels,
        };
      }),
    });
  } catch (error) {
    console.error("Error loading custom reports:", error);
    return NextResponse.json(
      { message: "Failed to load custom reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const payload = customReportSchema.parse(await request.json());

    if (
      payload.schedule.enabled &&
      payload.schedule.frequency === "weekly" &&
      !payload.schedule.dayOfWeek
    ) {
      return NextResponse.json(
        { message: "Weekly schedule requires dayOfWeek" },
        { status: 400 }
      );
    }

    const created = await database.report.create({
      data: {
        tenantId,
        name: payload.name,
        description: payload.description,
        reportType: "custom",
        query_config: {
          dataSource: payload.dataSource,
          widgets: payload.widgets,
          filters: payload.filters,
          schedule: payload.schedule,
          distribution: payload.distribution,
          templateId: payload.templateId,
        },
        display_config: {
          layout: payload.layout,
        },
        created_by: userId,
      },
    });

    return NextResponse.json({
      report: {
        id: created.id,
        name: created.name,
        description: created.description,
        updatedAt: created.updatedAt,
        scheduleEnabled: payload.schedule.enabled,
        channels: payload.distribution.channels,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid custom report payload", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Error saving custom report:", error);
    return NextResponse.json(
      { message: "Failed to save custom report" },
      { status: 500 }
    );
  }
}
