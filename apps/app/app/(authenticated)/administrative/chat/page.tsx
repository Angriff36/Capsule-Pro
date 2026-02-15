import { auth, currentUser } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Separator } from "@repo/design-system/components/ui/separator";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { AdministrativeChatClient } from "./components/admin-chat-client";

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} as const;

const AdministrativeChatPage = async () => {
  const { orgId, userId } = await auth();

  if (!(orgId && userId)) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses.at(0)?.emailAddress ?? null;

  // 1. Try by authUserId (the correct, linked path)
  let employee = await database.user.findFirst({
    where: {
      tenantId,
      authUserId: userId,
      deletedAt: null,
    },
    select: employeeSelect,
  });

  // 2. If not found by authUserId, try by email (unlinked employee)
  if (!employee && primaryEmail) {
    employee = await database.user.findFirst({
      where: {
        tenantId,
        email: primaryEmail,
        deletedAt: null,
      },
      select: employeeSelect,
    });
  }

  if (!employee) {
    return (
      <div className="space-y-6">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Operational Chat
          </h1>
          <p className="text-muted-foreground">
            Keep teams aligned with context-aware threads.
          </p>
        </div>
        <Separator />
        <Alert variant="destructive">
          <AlertTitle>Employee profile missing</AlertTitle>
          <AlertDescription>
            We couldn&apos;t find an employee record linked to your account.
            {primaryEmail
              ? ` Ask an admin to add ${primaryEmail} to staff or link your account.`
              : " Ask an admin to add your email to staff or link your account."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Operational Chat</h1>
        <p className="text-muted-foreground">
          Keep teams aligned with context-aware threads.
        </p>
      </div>

      <Separator />

      <AdministrativeChatClient employeeId={employee.id} tenantId={tenantId} />
    </div>
  );
};

export default AdministrativeChatPage;
