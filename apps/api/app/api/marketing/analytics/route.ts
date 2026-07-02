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

  const [emailLogs, leads, smsLogs, workflows, smsRules] = await Promise.all([
    database.emailLog.findMany({
      where: {
        tenantId,
        sentAt: { gte: startDate, lte: now },
      },
      select: {
        status: true,
        workflowId: true,
        sentAt: true,
      },
    }),
    database.lead.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: now },
        deletedAt: null,
      },
      select: {
        status: true,
        source: true,
        createdAt: true,
      },
    }),
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

  // Email metrics
  const totalSent = emailLogs.length;
  const opened = emailLogs.filter(
    (l) => l.status === "opened" || l.status === "delivered"
  ).length;
  const bounced = emailLogs.filter((l) => l.status === "bounced").length;
  const openRate = totalSent > 0 ? (opened / totalSent) * 100 : null;

  // Lead metrics
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const conversionRate =
    totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : null;
  const leadsBySource = leads.reduce<Record<string, number>>((acc, l) => {
    const src = l.source || "manual";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  // SMS metrics (aggregated by status)
  const smsStatusCounts = smsLogs.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = Number(row.total);
    return acc;
  }, {});
  const totalSms = Object.values(smsStatusCounts).reduce((a, b) => a + b, 0);
  const smsDelivered = smsStatusCounts.delivered || 0;
  const smsDeliveryRate = totalSms > 0 ? (smsDelivered / totalSms) * 100 : null;

  // Email performance by workflow
  const workflowEmailCounts = emailLogs.reduce<
    Record<string, { sent: number; opened: number }>
  >((acc, log) => {
    const wId = log.workflowId || "unlinked";
    if (!acc[wId]) {
      acc[wId] = { sent: 0, opened: 0 };
    }
    acc[wId].sent++;
    if (log.status === "opened" || log.status === "delivered") {
      acc[wId].opened++;
    }
    return acc;
  }, {});

  const emailPerformanceByWorkflow = workflows.map((w) => {
    const counts = workflowEmailCounts[w.id] || { sent: 0, opened: 0 };
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
