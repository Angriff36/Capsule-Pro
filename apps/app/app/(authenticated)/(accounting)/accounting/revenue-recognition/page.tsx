import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { RevenueRecognitionClient } from "./revenue-recognition-client";

export const metadata = {
  title: "Revenue Recognition",
};

export default async function RevenueRecognitionPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const [schedules, invoices, clients] = await Promise.all([
    database.revenueRecognitionSchedule.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    database.invoice.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, invoiceNumber: true },
    }),
    database.client.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        companyName: true,
        firstName: true,
        lastName: true,
      },
    }),
  ]);

  const invoiceMap = Object.fromEntries(
    invoices.map((inv) => [inv.id, inv.invoiceNumber])
  );

  const clientMap = Object.fromEntries(
    clients.map((cl) => {
      const personName = [cl.firstName, cl.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      return [cl.id, cl.companyName || personName || "Unnamed"];
    })
  );

  const serialized = schedules.map((s) => ({
    id: s.id,
    invoiceId: s.invoiceId,
    clientId: s.clientId,
    invoiceNumber: invoiceMap[s.invoiceId] || "Unknown",
    clientName: clientMap[s.clientId] || "Unknown",
    method: s.method,
    status: s.status,
    totalAmount: Number(s.totalAmount),
    recognizedAmount: Number(s.recognizedAmount),
    remainingAmount: Number(s.remainingAmount),
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
    description: s.description ?? null,
    recognitionPeriod: s.recognitionPeriod,
    totalMilestones: s.totalMilestones,
    completedMilestones: s.completedMilestones,
    createdAt: s.createdAt.toISOString(),
  }));

  const totalSchedules = serialized.length;
  const inProgress = serialized.filter(
    (s) => s.status === "IN_PROGRESS"
  ).length;
  const completed = serialized.filter((s) => s.status === "COMPLETED").length;
  const totalRecognized = serialized.reduce(
    (sum, s) => sum + s.recognizedAmount,
    0
  );
  const totalRemaining = serialized.reduce(
    (sum, s) => sum + s.remainingAmount,
    0
  );

  return (
    <RevenueRecognitionClient
      metrics={{
        totalSchedules,
        inProgress,
        completed,
        totalRecognized,
        totalRemaining,
      }}
      schedules={serialized}
    />
  );
}
