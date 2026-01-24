// Venue model does not exist in schema - this page is disabled

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";

export default function VenuePage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Venue Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Venue management is not yet implemented. The Venue model needs to be
            added to the database schema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
