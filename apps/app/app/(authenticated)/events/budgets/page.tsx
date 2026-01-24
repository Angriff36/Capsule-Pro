// Budget model does not exist in schema - this page is disabled

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

export default function BudgetsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Event Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Event budget management is not yet implemented. The Budget model
            needs to be added to the database schema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
