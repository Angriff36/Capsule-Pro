"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Loader2, Sparkles, User, Users } from "lucide-react";
import { useState } from "react";

interface StaffRole {
  role: string;
  count: number;
  hourlyRate: number;
  hoursNeeded: number;
  notes: string;
}

interface StaffingRecommendation {
  eventType: string;
  guestCount: number;
  totalStaff: number;
  totalLaborCost: number;
  roles: StaffRole[];
  notes: string[];
}

export function StaffingRecommendationsClient() {
  const [guestCount, setGuestCount] = useState<number>(100);
  const [eventType, setEventType] = useState("corporate");
  const [serviceStyle, setServiceStyle] = useState("plated");
  const [duration, setDuration] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] =
    useState<StaffingRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateRecommendation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staffing/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestCount, eventType, serviceStyle, duration }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setRecommendation(data.recommendation || data);
      }
    } catch (err) {
      setError("Failed to generate recommendation");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Staffing Recommendations</h1>
        <p className="text-muted-foreground">
          Get AI-powered staffing recommendations based on event details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Event Parameters
          </CardTitle>
          <CardDescription>
            Enter event details to get staffing recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Guest Count</label>
              <Input
                min={1}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                placeholder="100"
                type="number"
                value={guestCount}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select onValueChange={setEventType} value={eventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="nonprofit">Non-Profit</SelectItem>
                  <SelectItem value="festival">Festival</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Style</label>
              <Select onValueChange={setServiceStyle} value={serviceStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plated">Plated</SelectItem>
                  <SelectItem value="buffet">Buffet</SelectItem>
                  <SelectItem value="family_style">Family Style</SelectItem>
                  <SelectItem value="cocktail">Cocktail</SelectItem>
                  <SelectItem value="food_truck">Food Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (hours)</label>
              <Input
                min={1}
                onChange={(e) => setDuration(Number(e.target.value))}
                type="number"
                value={duration}
              />
            </div>
          </div>
          <Button
            className="mt-4"
            disabled={loading}
            onClick={generateRecommendation}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate Recommendation
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {recommendation && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  {recommendation.totalStaff}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estimated Labor Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${recommendation.totalLaborCost.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Staff-to-Guest Ratio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  1:
                  {Math.round(
                    recommendation.guestCount / recommendation.totalStaff
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Role Breakdown</CardTitle>
              <CardDescription>
                Recommended staffing by role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendation.roles.map((role, i) => (
                  <div
                    className="flex items-center justify-between p-4 border rounded-lg"
                    key={`${role.role}-${i}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold capitalize">
                          {role.role.replace(/_/g, " ")}
                        </h3>
                        <Badge variant="secondary">×{role.count}</Badge>
                      </div>
                      {role.notes && (
                        <p className="text-sm text-muted-foreground mt-1 ml-8">
                          {role.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>${role.hourlyRate}/hr</div>
                      <div>{role.hoursNeeded}h each</div>
                      <div className="font-medium text-foreground">
                        ${(role.count * role.hourlyRate * role.hoursNeeded).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {recommendation.notes && recommendation.notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Notes & Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {recommendation.notes.map((note, i) => (
                    <li
                      className="flex items-start gap-2 text-sm"
                      key={`note-${i}`}
                    >
                      <span className="text-primary">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
