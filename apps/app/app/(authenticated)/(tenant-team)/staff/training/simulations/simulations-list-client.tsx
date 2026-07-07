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
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { staffTrainingSimulations } from "@/app/lib/routes";

interface SimulationSummary {
  category: string;
  description: string;
  difficulty: string;
  durationMinutes: number;
  id: string;
  stepCount: number;
  title: string;
}

export function SimulationsListClient() {
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(staffTrainingSimulations());
        if (!res.ok) {
          throw new Error("load failed");
        }
        const json = (await res.json()) as { simulations: SimulationSummary[] };
        setSimulations(json.simulations);
      } catch {
        toast.error("Failed to load simulations");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-2xl">Training Simulations</h1>
        <p className="text-muted-foreground text-sm">
          Scenario-based drills for service, safety, and execution readiness.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {simulations.map((sim) => (
          <Card key={sim.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{sim.title}</CardTitle>
                <Badge variant="outline">{sim.difficulty}</Badge>
              </div>
              <CardDescription>{sim.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {sim.stepCount} steps · {sim.durationMinutes} min
              </span>
              <Button asChild size="sm">
                <Link href={`/staff/training/simulations/${sim.id}`}>
                  Start
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
