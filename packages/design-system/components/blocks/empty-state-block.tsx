import * as React from "react";
import { FileText, UploadCloud } from "lucide-react";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";

/**
 * EmptyStateBlock - An empty state component block
 */
export function EmptyStateBlock() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Create your first invoice to start tracking revenue and payments.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button size="sm">Create invoice</Button>
              <Button variant="outline" size="sm">
                <UploadCloud />
                Import CSV
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Tip: Importing historical invoices helps build better forecasts.
            </p>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
