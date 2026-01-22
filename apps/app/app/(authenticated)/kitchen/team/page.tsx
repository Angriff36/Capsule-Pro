import { Header } from "../../components/header";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Users, UserPlus, Settings } from "lucide-react";
import Link from "next/link";

const KitchenTeamPage = () => {
  return (
    <>
      <Header page="Kitchen Team" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Kitchen team management is handled in the Staff module. View team members,
              their roles, skills, and station assignments there.
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
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
                <Settings className="h-4 w-4" />
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

        <Card>
          <CardHeader>
            <CardTitle>Common Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button className="h-auto flex-col gap-2 py-4" variant="outline" asChild>
                <Link href="/staff/team?view=online">
                  <Users className="h-5 w-5" />
                  <span>Who's Working</span>
                </Link>
              </Button>
              <Button className="h-auto flex-col gap-2 py-4" variant="outline" asChild>
                <Link href="/staff/team?action=assign">
                  <UserPlus className="h-5 w-5" />
                  <span>Quick Assign</span>
                </Link>
              </Button>
              <Button className="h-auto flex-col gap-2 py-4" variant="outline" asChild>
                <Link href="/staff/availability">
                  <Settings className="h-5 w-5" />
                  <span>Availability</span>
                </Link>
              </Button>
              <Button className="h-auto flex-col gap-2 py-4" variant="outline" asChild>
                <Link href="/staff/time-off">
                  <span className="text-xl">📅</span>
                  <span>Time Off</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default KitchenTeamPage;
