import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { ManifestEditorClient } from "./manifest-editor-client";

const ManifestEditorPage = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Settings / Rules Explorer</MonoLabel>
          <DisplayHeading>Rules Explorer</DisplayHeading>
          <CommandBandLede>
            Read-only view of what actions exist, what can block them, and who
            can run them (compiled from Manifest).
          </CommandBandLede>
        </div>
      </CommandBandHeader>
    </CommandBand>

    <OperationalColumn>
      <ManifestEditorClient />
    </OperationalColumn>
  </PageCanvas>
);

export default ManifestEditorPage;
