import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Calendar, Clock, ExternalLink, Users } from "lucide-react";
import Link from "next/link";

const KitchenSchedulePage = () => {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Schedule</h1>
        <p className="text-muted-foreground">
          Access staff scheduling features from the Staff module
        </p>
      </div>
      <Separator />

      {/* Scheduling Navigation Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Staff Scheduling
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Manage Schedule
            </CardTitle>
            <CardDescription>
              Kitchen staff scheduling is managed in the Staff module. View and
              manage shifts, time-off requests, and team availability there.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/staff/schedule">
                View Staff Schedule
                <ExternalLink className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/staff/team">
                Manage Team
                <ExternalLink className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Features Overview Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Features Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-4" />
                Shift Management
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Create and edit shifts</li>
                <li>Assign staff to stations</li>
                <li>Manage overtime and breaks</li>
                <li>View coverage reports</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Team Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Track employee availability</li>
                <li>Manage time-off requests</li>
                <li>View skills and certifications</li>
                <li>Handle shift swaps</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Quick Stats</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Today&apos;s Shifts
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Staff On Duty
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Coverage Alerts
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">-</div>
                <div className="text-sm text-muted-foreground">
                  Pending Requests
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Navigate to Staff module for full scheduling functionality.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default KitchenSchedulePage;
