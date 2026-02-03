import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * EmptyStateBlock - An empty state component block
 * TODO: paste shadcn Blocks composition here
 */
export function EmptyStateBlock() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Empty State</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm">
          TODO: paste shadcn Blocks composition here
        </div>
      </CardContent>
    </Card>
  );
}
