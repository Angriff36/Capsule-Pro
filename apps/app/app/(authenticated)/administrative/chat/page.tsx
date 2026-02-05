import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Separator } from "@repo/design-system/components/ui/separator";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { AdministrativeChatClient } from "./components/admin-chat-client";

const AdministrativeChatPage = async () => {
  const { orgId, userId } = await auth();

  if (!orgId || !userId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const employee = await database.user.findFirst({
    where: {
      tenantId,
      authUserId: userId,
    },
    select: {
      firstName: true,
      lastName: true,
    },
  });

  const displayName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : "You";

  return (
    <div className="space-y-8">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Operational Chat</h1>
        <p className="text-muted-foreground">
          Keep teams aligned with context-aware threads.
        </p>
      </div>

      <Separator />

      <AdministrativeChatClient
        displayName={displayName}
        tenantId={tenantId}
        userId={userId}
      />
    </div>
  );
};

export default AdministrativeChatPage;
