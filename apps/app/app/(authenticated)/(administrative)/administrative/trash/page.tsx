import { auth } from "@repo/auth/server";
import { TrashPageClient } from "./components/trash-page-client";

interface TrashPageProps {
  searchParams?: Promise<{
    entityType?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function TrashPage({ searchParams }: TrashPageProps) {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const params = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <TrashPageClient initialParams={params ?? {}} />
    </div>
  );
}
