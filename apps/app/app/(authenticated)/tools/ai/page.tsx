import {
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { AiClient } from "./ai-client";

const ToolsAiPage = () => (
  <PageCanvas>
    <OperationalColumn>
      <div className="space-y-0.5">
        <MonoLabel tone="dark">Tools</MonoLabel>
        <DisplayHeading>AI Integrations</DisplayHeading>
        <p className="text-muted-foreground">
          AI-assisted suggestions, event summaries, and workflow helpers.
        </p>
      </div>
      <AiClient />
    </OperationalColumn>
  </PageCanvas>
);

export default ToolsAiPage;
