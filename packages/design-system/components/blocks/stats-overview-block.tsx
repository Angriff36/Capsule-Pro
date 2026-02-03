import * as React from "react";
import { Activity, CreditCard, DollarSign, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

/**
 * StatsOverviewBlock - A stats overview component block
 */
export function StatsOverviewBlock() {
  const stats = [
    {
      label: "Total Revenue",
      value: "$48,500",
      change: "+12.4%",
      changeTone: "text-emerald-600 dark:text-emerald-400",
      icon: DollarSign,
    },
    {
      label: "Active Subscriptions",
      value: "1,284",
      change: "+3.2%",
      changeTone: "text-emerald-600 dark:text-emerald-400",
      icon: Users,
    },
    {
      label: "Failed Payments",
      value: "36",
      change: "-1.1%",
      changeTone: "text-red-600 dark:text-red-400",
      icon: CreditCard,
    },
    {
      label: "System Uptime",
      value: "99.98%",
      change: "+0.04%",
      changeTone: "text-emerald-600 dark:text-emerald-400",
      icon: Activity,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              <Icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-muted-foreground text-xs">
                <span className={stat.changeTone}>{stat.change}</span> from last
                month
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
