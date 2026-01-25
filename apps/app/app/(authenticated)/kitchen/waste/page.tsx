import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { BarChart3, Trash2, TrendingUp } from "lucide-react";
import { WasteEntriesClient } from "./waste-entries-client";
import { WasteReportsClient } from "./waste-reports-client";
import { WasteStatsCards } from "./waste-stats-cards";
import { WasteTrendsClient } from "./waste-trends-client";

export const dynamic = "force-dynamic";

export default function WasteTrackingPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Waste Tracking</h1>
          <p className="text-muted-foreground">
            Log food waste to identify reduction opportunities and cost savings
          </p>
        </div>
      </div>

      <WasteStatsCards />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
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
    </div>
  );
}
