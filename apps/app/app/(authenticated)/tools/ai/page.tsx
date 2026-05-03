import { Separator } from "@repo/design-system/components/ui/separator";
import { AiClient } from "./ai-client";

const ToolsAiPage = () => (
  <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-2xl font-semibold tracking-tight">AI Integrations</h1>
      <p className="text-muted-foreground">
        AI-assisted suggestions, event summaries, and workflow helpers.
      </p>
    </div>
    <Separator />
    <AiClient />
  </div>
);

export default ToolsAiPage;
