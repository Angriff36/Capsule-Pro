import { Separator } from "@repo/design-system/components/ui/separator";
import { PipelineBoard } from "./components/pipeline-board";

const PipelinePage = async () => {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Deal Pipeline</h1>
        <p className="text-muted-foreground">
          Track deals across stages — drag and drop to move a deal forward or
          backward.
        </p>
      </div>

      <Separator />

      <PipelineBoard />
    </div>
  );
};

export default PipelinePage;
