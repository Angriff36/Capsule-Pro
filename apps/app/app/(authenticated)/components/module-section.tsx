import { Separator } from "@repo/design-system/components/ui/separator";

type ModuleSectionProperties = {
  title: string;
  summary: string;
};

export const ModuleSection = ({ title, summary }: ModuleSectionProperties) => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{summary}</p>
    </div>
    <Separator />

    {/* Main Content Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Module Features
      </h2>
      <p className="text-sm text-muted-foreground">
        This module section is under development. Check back soon for updates.
      </p>
    </section>
  </div>
);
