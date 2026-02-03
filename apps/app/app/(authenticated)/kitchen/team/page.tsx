import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Settings, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { Header } from "../../components/header";

const KitchenTeamPage = () => {
  return (
    <>
      <Header page="Kitchen Team" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Team</h1>
          <p className="text-muted-foreground">
            Access team management features from the Staff module
          </p>
        </div>

        <Separator />

        {/* Team Management Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Team Management
          </h2>
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Team Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Kitchen team management is handled in the Staff module. View team
              members, their roles, skills, and station assignments there.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/staff/team">View Full Team</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/staff/schedule">View Schedule</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </section>

        {/* Features Overview Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Features Overview
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Add new team members</li>
                  <li>Set up roles and permissions</li>
                  <li>Assign station skills</li>
                  <li>Configure availability</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="size-4" />
                  Role Management
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Define kitchen roles</li>
                  <li>Set skill requirements</li>
                  <li>Configure certifications</li>
                  <li>Manage training records</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Station Assignments</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Assign staff to stations</li>
                  <li>Track station coverage</li>
                  <li>Manage lead positions</li>
                  <li>View team composition</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Common Tasks Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Common Tasks
          </h2>
          <Card>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <Link href="/staff/team?view=online">
                  <Users className="size-5" />
                  <span>Who's Working</span>
                </Link>
              </Button>
              <Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <Link href="/staff/team?action=assign">
                  <UserPlus className="size-5" />
                  <span>Quick Assign</span>
                </Link>
              </Button>
              <Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <Link href="/staff/availability">
                  <Settings className="size-5" />
                  <span>Availability</span>
                </Link>
              </Button>
              <Button
                asChild
                className="h-auto flex-col gap-2 py-4"
                variant="outline"
              >
                <Link href="/staff/time-off">
                  <span className="text-xl">📅</span>
                  <span>Time Off</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </section>
      </div>
    </>
  );
};

export default KitchenTeamPage;
