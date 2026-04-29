import { Separator } from "@repo/design-system/components/ui/separator";
import { BattleboardsClient } from "./battleboards-client";

const ToolsBattleboardsPage = () => (
  <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Battleboards</h1>
      <p className="text-muted-foreground">
        Build and manage battleboards for production and service coordination.
      </p>
    </div>
    <Separator />
    <BattleboardsClient />
  </div>
);

export default ToolsBattleboardsPage;
