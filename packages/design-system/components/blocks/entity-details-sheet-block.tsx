"use client";

import { Calendar, ExternalLink, Mail, Phone } from "lucide-react";
import type * as React from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

/**
 * EntityDetailsSheetBlock - An entity details sheet component block
 */
export function EntityDetailsSheetBlock() {
  const detailRows: { label: string; value: React.ReactNode }[] = [
    { label: "Owner", value: "Jamie Clark" },
    { label: "Department", value: "Revenue Operations" },
    { label: "Contract value", value: "$48,000 / year" },
    {
      label: "Status",
      value: (
        <Badge className="font-medium" variant="secondary">
          Active
        </Badge>
      ),
    },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entity Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Customer</div>
            <div className="text-lg font-semibold">Northwind Logistics</div>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm">View details</Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Northwind Logistics</SheetTitle>
                <SheetDescription>
                  Enterprise account with a focus on fulfillment automation.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-2">
                <div className="grid gap-3 text-sm">
                  {detailRows.map((row) => (
                    <div
                      className="flex items-center justify-between"
                      key={row.label}
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground" />
                    <span>ops@northwind.io</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>+1 (415) 555-0199</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>Next renewal: Apr 12, 2026</span>
                  </div>
                </div>
              </div>
              <SheetFooter>
                <Button variant="outline">
                  <ExternalLink />
                  Open profile
                </Button>
                <Button>Send message</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
}
