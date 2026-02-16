import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { ArrowLeft } from "lucide-react";

/**
 * Loading state for the recipe detail page.
 * Shows skeleton placeholders that match the actual page layout.
 */
export default function Loading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b bg-background/80 p-4">
        <div className="flex items-center gap-2">
          <Button disabled size="icon" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-6 w-24 bg-muted rounded" />
        </div>
        <div className="h-9 w-20 bg-muted rounded" />
      </div>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Recipe Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-64 bg-muted rounded" />
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
            <div className="h-5 w-32 bg-muted rounded" />
          </div>
          <div className="h-10 w-28 bg-muted rounded" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
        </div>

        {/* Metadata Bar skeleton */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-5 w-5 bg-muted rounded" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-5 w-12 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-5 w-5 bg-muted rounded" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-5 w-12 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-5 w-5 bg-muted rounded" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-5 w-12 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="h-5 w-5 bg-muted rounded" />
              <div className="space-y-2">
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="h-5 w-12 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs skeleton */}
        <div className="rounded-3xl border bg-card/50 p-4">
          <div className="space-y-4">
            {/* Tab list skeleton */}
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-muted rounded-full" />
              <div className="h-10 w-28 bg-muted rounded-full" />
              <div className="h-10 w-20 bg-muted rounded-full" />
              <div className="h-10 w-20 bg-muted rounded-full" />
              <div className="h-10 w-18 bg-muted rounded-full" />
            </div>

            {/* Tab content skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-5/6 bg-muted rounded" />
                <div className="h-4 w-4/6 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
