import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { BarChart3, Trash2, TrendingUp } from "lucide-react";
import { WasteEntriesClient } from "./waste-entries-client";
import { WasteReportsClient } from "./waste-reports-client";
import { WasteStatsCards } from "./waste-stats-cards";
import { WasteTrendsClient } from "./waste-trends-client";

export const dynamic = "force-dynamic";

export default function WasteTrackingPage() {
  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">
            Waste Tracking
          </h1>
          <p className="text-muted-foreground">
            Log food waste to identify reduction opportunities and cost savings
          </p>
        </div>
      </div>

      <Separator />

      <section>
        <WasteStatsCards />
      </section>

      <section>
        <h2 className="mb-4 font-medium text-muted-foreground text-sm">
          Waste Management
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="size-4" />
                Log Waste Entry
              </CardTitle>
              <CardDescription>
                Record food waste with reason and quantity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WasteEntriesClient />
            </CardContent>
          </Card>

          <Card tone="canvas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4" />
                Waste Trends
              </CardTitle>
              <CardDescription>
                View waste analytics and reduction opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WasteTrendsClient />
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-medium text-muted-foreground text-sm">
          Reports & Analysis
        </h2>
        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4" />
              Waste Reports
            </CardTitle>
            <CardDescription>
              Detailed breakdown by item, reason, location, and date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WasteReportsClient />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
