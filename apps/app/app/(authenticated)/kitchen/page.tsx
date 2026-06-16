import { auth } from "@repo/auth/server";
import { loadKitchenProductionBoard } from "@/app/lib/convex/domain-loaders";
import { requireTenantId } from "@/app/lib/tenant";
import { KitchenNavigation } from "./components/kitchen-navigation";
import { ProductionBoardClient } from "./production-board-client";
import { ProductionBoardRealtime } from "./production-board-realtime";

const KitchenPage = async () => {
  const { orgId, userId: clerkId } = await auth();

  if (!orgId) {
    return (
      <div className="p-6">
        <p className="text-red-500">Unauthorized: No organization ID found</p>
      </div>
    );
  }

  const tenantId = await requireTenantId();
  const { tasks: tasksWithUsers } = await loadKitchenProductionBoard();

  return (
    <div data-design-system-shell="operational">
      <KitchenNavigation />
      <ProductionBoardClient
        currentUserId={clerkId ?? null}
        initialTasks={tasksWithUsers as never}
        tenantId={tenantId}
      />
      <ProductionBoardRealtime tenantId={tenantId} userId={clerkId ?? undefined} />
    </div>
  );
};

export default KitchenPage;
