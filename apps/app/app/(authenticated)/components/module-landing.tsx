import {
  Card,
  CardContent,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";

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
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{summary}</p>
    </div>

    <Separator />

    {/* Features Overview Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Features Overview
      </h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item}>
            <CardContent className="p-6">
              <p className="text-muted-foreground text-sm">{item}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  </div>
);
