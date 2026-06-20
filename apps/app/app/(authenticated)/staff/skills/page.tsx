import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { SkillsClient } from "./skills-client";

export default async function StaffSkillsPage() {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const employees = await database.user.findMany({
    where: { tenantId, deletedAt: null, isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { lastName: "asc" },
  });

  const options = employees.map((e) => ({
    id: e.id,
    label: `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || e.email || e.id,
  }));

  return <SkillsClient employees={options} />;
}
