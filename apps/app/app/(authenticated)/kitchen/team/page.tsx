import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Calendar, Settings, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import {
  OperationalPageShell,
  OperationalSection,
} from "../../components/operational-page-shell";
import { Header } from "../../components/header";

const KitchenTeamPage = () => {
  return (
    <>
      <Header page="Kitchen Team" pages={["Kitchen Ops"]} />
      <OperationalPageShell
        description="Access team management features from the Staff module."
        eyebrow="Kitchen / Team"
        title="Kitchen team"
        withCanvas={false}
      >
        <OperationalSection title="Team management">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Team Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Kitchen team management is handled in the Staff module. View
                team members, their roles, skills, and station assignments
                there.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/staffing">View Full Team</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/scheduling/shifts">View Schedule</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </OperationalSection>

        <OperationalSection title="Features overview">
          <div className="grid gap-6 md:grid-cols-3">
            <Card tone="canvas">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  Onboarding
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                <ul className="list-disc space-y-1 pl-4">
                  <li>Add new team members</li>
                  <li>Set up roles and permissions</li>
                  <li>Assign station skills</li>
                  <li>Configure availability</li>
                </ul>
              </CardContent>
            </Card>

            <Card tone="canvas">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="size-4" />
                  Role Management
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                <ul className="list-disc space-y-1 pl-4">
                  <li>Define kitchen roles</li>
                  <li>Set skill requirements</li>
                  <li>Configure certifications</li>
                  <li>Manage training records</li>
                </ul>
              </CardContent>
            </Card>

            <Card tone="canvas">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-4" />
                  Station Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                <ul className="list-disc space-y-1 pl-4">
                  <li>Assign staff to stations</li>
                  <li>Track station coverage</li>
                  <li>Manage lead positions</li>
                  <li>View team composition</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </OperationalSection>

        <OperationalSection title="Common tasks">
          <Card tone="canvas">
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Button
                  asChild
                  className="h-auto flex-col gap-2 py-4"
                  variant="outline"
                >
                  <Link href="/staffing">
                    <Users className="size-5" />
                    <span>Who's Working</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-auto flex-col gap-2 py-4"
                  variant="outline"
                >
                  <Link href="/staffing">
                    <UserPlus className="size-5" />
                    <span>Quick Assign</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-auto flex-col gap-2 py-4"
                  variant="outline"
                >
                  <Link href="/scheduling/availability">
                    <Settings className="size-5" />
                    <span>Availability</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-auto flex-col gap-2 py-4"
                  variant="outline"
                >
                  <Link href="/scheduling/time-off">
                    <Calendar className="size-5" />
                    <span>Time Off</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </OperationalSection>
      </OperationalPageShell>
    </>
  );
};

export default KitchenTeamPage;
