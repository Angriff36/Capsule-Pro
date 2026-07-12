import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

function calculateWindow(window: string) {
  const now = new Date();
  const startDate = new Date();
  switch (window) {
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "180d":
      startDate.setDate(now.getDate() - 180);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }
  return { now, startDate };
}

export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenantId = await getTenantIdForOrg(orgId);

  const { searchParams } = new URL(request.url);
  const window = searchParams.get("window") || "30d";
  const { now, startDate } = calculateWindow(window);

  // ponytail: aggregate at the source via GROUP BY (mirrors the sms_logs query below)
  // instead of materializing every email log / lead into JS. A busy tenant can write
  // 100k+ email logs in a 180d window — O(groups) rows beats O(rows) in memory + latency.
  // email_logs is in tenant_admin; leads is in tenant_crm (different schema).
  const [
    emailByStatus,
    emailByWorkflow,
    leadByStatus,
    leadBySource,
    smsLogs,
    workflows,
    smsRules,
  ] = await Promise.all([
    database.$queryRaw<Array<{ status: string; total: bigint }>>`
      SELECT status, COUNT(*)::bigint AS total
      FROM tenant_admin.email_logs
      WHERE tenant_id = ${tenantId}::uuid
        AND sent_at >= ${startDate}
        AND sent_at <= ${now}
      GROUP BY status
    `,
    database.$queryRaw<
      Array<{ workflow_id: string | null; sent: bigint; opened: bigint }>
    >`
      SELECT workflow_id,
             COUNT(*)::bigint AS sent,
             COUNT(*) FILTER (WHERE status IN ('opened', 'delivered'))::bigint AS opened
      FROM tenant_admin.email_logs
      WHERE tenant_id = ${tenantId}::uuid
        AND sent_at >= ${startDate}
        AND sent_at <= ${now}
      GROUP BY workflow_id
    `,
    database.$queryRaw<Array<{ status: string; total: bigint }>>`
      SELECT status, COUNT(*)::bigint AS total
      FROM tenant_crm.leads
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${now}
        AND deleted_at IS NULL
      GROUP BY status
    `,
    database.$queryRaw<Array<{ source: string | null; total: bigint }>>`
      SELECT source, COUNT(*)::bigint AS total
      FROM tenant_crm.leads
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${now}
        AND deleted_at IS NULL
      GROUP BY source
    `,
    database.$queryRaw<Array<{ status: string; total: bigint }>>`
      SELECT status, COUNT(*)::bigint as total FROM tenant_admin.sms_logs
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${now}
      GROUP BY status
    `,
    database.emailWorkflow.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        triggerType: true,
        isActive: true,
      },
    }),
    database.smsAutomationRule.findMany({
      where: {
        tenantId: tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        triggerType: true,
        isActive: true,
      },
    }),
  ]);

  // Email metrics (aggregated by status). "opened" counts delivered too — preserved
  // from the prior JS aggregation (openRate has always included delivered).
  const emailStatusCounts = new Map<string, number>(
    emailByStatus.map((row) => [row.status, Number(row.total)])
  );
  const totalSent = emailByStatus.reduce((sum, r) => sum + Number(r.total), 0);
  const opened =
    (emailStatusCounts.get("opened") ?? 0) +
    (emailStatusCounts.get("delivered") ?? 0);
  const bounced = emailStatusCounts.get("bounced") ?? 0;
  const openRate = totalSent > 0 ? (opened / totalSent) * 100 : null;

  // Email performance by workflow (aggregated by workflow_id; null → "unlinked").
  const workflowEmailCounts = new Map<
    string,
    { sent: number; opened: number }
  >(
    emailByWorkflow.map((row) => [
      row.workflow_id ?? "unlinked",
      { sent: Number(row.sent), opened: Number(row.opened) },
    ])
  );
  const emailPerformanceByWorkflow = workflows.map((w) => {
    const counts = workflowEmailCounts.get(w.id) ?? { sent: 0, opened: 0 };
    return {
      id: w.id,
      name: w.name,
      triggerType: w.triggerType,
      isActive: w.isActive,
      sent: counts.sent,
      opened: counts.opened,
      openRate: counts.sent > 0 ? (counts.opened / counts.sent) * 100 : null,
    };
  });

  // Lead metrics (aggregated by status / source).
  const leadStatusCounts = new Map<string, number>(
    leadByStatus.map((row) => [row.status, Number(row.total)])
  );
  const totalLeads = leadByStatus.reduce((sum, r) => sum + Number(r.total), 0);
  const convertedLeads = leadStatusCounts.get("converted") ?? 0;
  const conversionRate =
    totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : null;
  const leadsBySource = leadBySource.reduce<Record<string, number>>(
    (acc, row) => {
      const src = row.source || "manual";
      acc[src] = (acc[src] || 0) + Number(row.total);
      return acc;
    },
    {}
  );

  // SMS metrics (aggregated by status).
  const smsStatusCounts = smsLogs.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = Number(row.total);
    return acc;
  }, {});
  const totalSms = Object.values(smsStatusCounts).reduce((a, b) => a + b, 0);
  const smsDelivered = smsStatusCounts.delivered || 0;
  const smsDeliveryRate = totalSms > 0 ? (smsDelivered / totalSms) * 100 : null;

  // SMS performance summary
  const smsPerformanceSummary = smsRules.map((r) => ({
    id: r.id,
    name: r.name,
    triggerType: r.triggerType,
    isActive: r.isActive,
  }));

  return NextResponse.json({
    window,
    metrics: {
      totalSent,
      openRate,
      bounced,
      totalLeads,
      conversionRate,
      totalSms,
      smsDeliveryRate,
      leadsBySource,
      activeWorkflows: workflows.filter((w) => w.isActive).length,
      activeSmsRules: smsRules.filter((r) => r.isActive).length,
    },
    emailPerformanceByWorkflow,
    smsPerformanceSummary,
  });
}
