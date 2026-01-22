import { Header } from "../../components/header";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Smartphone, Zap, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

const KitchenMobilePage = () => {
  return (
    <>
      <Header page="Mobile Workflow" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile-Optimized Kitchen Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">
              The Production Board is fully responsive and works on mobile devices.
              Line staff can claim tasks, track progress, and mark completion from
              anywhere in the kitchen.
            </p>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" asChild>
              <Link href="/kitchen">Open Production Board</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Quick Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Tap any task to claim it instantly</li>
                <li>Auto-assigns to your profile</li>
                <li>Changes status to In Progress</li>
                <li>One-tap release if you get pulled away</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Progress Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Update task status as you work</li>
                <li>Add notes and completion details</li>
                <li>See time elapsed on each task</li>
                <li>Get reminders for upcoming tasks</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Mark tasks done with one tap</li>
                <li>Add completion notes</li>
                <li>Auto-updates team statistics</li>
                <li>Triggers real-time board updates</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Tasks View</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>See only your claimed tasks</li>
                <li>Quick access from the board header</li>
                <li>Filter by station or priority</li>
                <li>Pull-to-refresh for updates</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc pl-4 space-y-2">
              <li>
                <strong>Claim before starting:</strong> Always claim a task before
                working on it so your team can see what you&apos;re doing.
              </li>
              <li>
                <strong>Release if interrupted:</strong> If you get pulled away,
                release the task so someone else can pick it up.
              </li>
              <li>
                <strong>Add notes:</strong> Adding notes helps the next person
                understand what&apos;s been done and what remains.
              </li>
              <li>
                <strong>Keep it updated:</strong> Update task status as you progress
                to help the team track overall kitchen status.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default KitchenMobilePage;
