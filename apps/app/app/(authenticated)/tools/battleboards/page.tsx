import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { BattleboardsClient } from "./battleboards-client";

const ToolsBattleboardsPage = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Tools / Battleboards</MonoLabel>
          <DisplayHeading>Battleboards</DisplayHeading>
          <CommandBandLede>
            Build and manage battleboards for production and service
            coordination.
          </CommandBandLede>
        </div>
      </CommandBandHeader>
    </CommandBand>

    <OperationalColumn>
      <BattleboardsClient />
    </OperationalColumn>
  </PageCanvas>
);

export default ToolsBattleboardsPage;
