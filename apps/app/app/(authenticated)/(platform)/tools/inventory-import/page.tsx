import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Upload } from "lucide-react";
import { InventoryImportClient } from "./inventory-import-client";

const ToolsInventoryImportPage = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Tools / Inventory Import</MonoLabel>
          <DisplayHeading>Bulk Inventory Import</DisplayHeading>
          <CommandBandLede>
            Upload a Goodshuffle Pro inventory export (.xlsx) to bulk-add or
            update items in your Capsule Pro inventory.
          </CommandBandLede>
        </div>
      </CommandBandHeader>
      <CommandBandBody>
        <MetricBand cols={3}>
          <MetricCell>
            <MetricLabel>Source format</MetricLabel>
            <MetricValue>
              <Upload className="mr-2 inline h-5 w-5" />
              XLSX
            </MetricValue>
            <p className="text-sm text-white/70">Goodshuffle export</p>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Dedup key</MetricLabel>
            <MetricValue>Product ID</MetricValue>
            <p className="text-sm text-white/70">Goodshuffle item number</p>
          </MetricCell>
          <MetricCell>
            <MetricLabel>Target</MetricLabel>
            <MetricValue>InventoryItem</MetricValue>
            <p className="text-sm text-white/70">Capsule Pro inventory</p>
          </MetricCell>
        </MetricBand>
      </CommandBandBody>
    </CommandBand>

    <OperationalColumn>
      <InventoryImportClient />
    </OperationalColumn>
  </PageCanvas>
);

export default ToolsInventoryImportPage;
