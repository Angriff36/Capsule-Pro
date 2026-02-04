"use client";

import { Download, Plus, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";

/**
 * DashboardHeaderBlock - A dashboard header component block
 */
export function DashboardHeaderBlock() {
  const teamMembers = [
    {
      name: "Alex Johnson",
      role: "Operations",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    },
    {
      name: "Jordan Lee",
      role: "Analytics",
      avatar:
        "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=200&auto=format&fit=crop",
    },
    {
      name: "Priya Singh",
      role: "Finance",
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=200&auto=format&fit=crop",
    },
  ];

  const quickStats = [
    { label: "Open approvals", value: "12" },
    { label: "Items flagged", value: "4" },
    { label: "On-track projects", value: "28" },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Operations</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Overview</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Operations Overview</CardTitle>
            <CardDescription>
              Track throughput, approvals, and active workstreams across teams.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline">
              <Download />
              Download
            </Button>
            <Button size="sm">
              <Plus />
              Create report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Live</Badge>
            <span className="text-sm text-muted-foreground">
              Updated 5 minutes ago
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {teamMembers.map((member) => (
                <Avatar
                  className="border-2 border-background"
                  key={member.name}
                >
                  <AvatarImage alt={member.name} src={member.avatar} />
                  <AvatarFallback>
                    {member.name
                      .split(" ")
                      .map((chunk) => chunk[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <Button size="sm" variant="ghost">
              <Users />
              Manage access
            </Button>
          </div>
        </div>
        <Separator />
        <div className="grid gap-4 sm:grid-cols-3">
          {quickStats.map((stat) => (
            <div className="space-y-1" key={stat.label}>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-xl font-semibold">{stat.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
