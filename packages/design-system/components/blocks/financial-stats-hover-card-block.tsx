"use client"

import { ArrowDown, ArrowUp, DollarSign } from "lucide-react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card"

const metrics = [
  {
    icon: ArrowUp,
    label: "Income",
    value: "$52.8k",
    tone: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: ArrowDown,
    label: "Expenses",
    value: "$7.6k",
    tone: "text-red-600 dark:text-red-400",
  },
]

export function FinancialStatsHoverCardBlock() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
          type="button"
        >
          <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <div className="text-2xl font-bold">$45.2k</div>
            <div className="text-sm text-muted-foreground">
              Monthly Revenue
            </div>
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Revenue Breakdown</h4>
          <div className="space-y-2 text-sm">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div
                  className="flex items-center justify-between rounded-md bg-muted p-2"
                  key={metric.label}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${metric.tone}`} />
                    <span className="text-muted-foreground">
                      {metric.label}
                    </span>
                  </div>
                  <span className="font-medium">{metric.value}</span>
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground">Net Profit</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                $45.2k
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">+18.2% vs. last month</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
