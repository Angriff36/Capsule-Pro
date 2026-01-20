import { Card } from "@repo/design-system/components/ui/card";

type ModuleLandingProperties = {
  title: string;
  summary: string;
  highlights: string[];
};

export const ModuleLanding = ({
  title,
  summary,
  highlights,
}: ModuleLandingProperties) => (
  <div className="space-y-6">
    <header className="space-y-2">
      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
        Overview
      </p>
      <h1 className="font-semibold text-2xl text-foreground">{title}</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">{summary}</p>
    </header>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {highlights.map((item) => (
        <Card key={item} className="bg-card/60 p-4">
          <p className="text-muted-foreground text-sm">{item}</p>
        </Card>
      ))}
    </div>
  </div>
);
