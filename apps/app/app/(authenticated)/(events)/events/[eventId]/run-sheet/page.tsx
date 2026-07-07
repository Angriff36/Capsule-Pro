import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { RunSheetClient } from "./run-sheet-client";

interface RunSheetPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function RunSheetPage({ params }: RunSheetPageProps) {
  const session = await auth();
  if (!session?.orgId) {
    redirect("/sign-in");
  }

  const { eventId } = await params;

  return <RunSheetClient eventId={eventId} />;
}
