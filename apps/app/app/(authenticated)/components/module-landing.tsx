import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface ModuleLandingFeature {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  icon?: LucideIcon;
}

interface ModuleLandingProperties {
  title: string;
  summary: string;
  highlights: Array<string | ModuleLandingFeature>;
}

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
        {highlights.map((item) => {
          if (typeof item === "string") {
            return (
              <Card key={item}>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-sm">{item}</p>
                </CardContent>
              </Card>
            );
          }

          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-start gap-3">
                  {Icon ? (
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <h3 className="font-medium text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
                {item.href && item.actionLabel ? (
                  <div className="mt-auto">
                    <Button asChild size="sm" variant="outline">
                      <Link href={item.href}>
                        {item.actionLabel}
                        <ArrowRightIcon className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  </div>
);
