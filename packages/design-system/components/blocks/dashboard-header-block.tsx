import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * DashboardHeaderBlock - A dashboard header component block
 * TODO: paste shadcn Blocks composition here
 */
export function DashboardHeaderBlock() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Dashboard Header</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm">
          TODO: paste shadcn Blocks composition here
        </div>
      </CardContent>
    </Card>
  );
}
