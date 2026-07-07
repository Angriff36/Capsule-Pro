import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { ManifestPlaygroundClient } from "./manifest-playground-client";

const ManifestPlaygroundPage = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Settings / Rules Playground</MonoLabel>
          <DisplayHeading>Rules Playground</DisplayHeading>
          <CommandBandLede>
            Try example inputs and preview what would happen (this build is
            read-only; it will not run real commands).
          </CommandBandLede>
        </div>
      </CommandBandHeader>
    </CommandBand>

    <OperationalColumn>
      <ManifestPlaygroundClient />
    </OperationalColumn>
  </PageCanvas>
);

export default ManifestPlaygroundPage;
