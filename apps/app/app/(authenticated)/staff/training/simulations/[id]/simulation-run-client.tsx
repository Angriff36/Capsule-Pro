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
import { Progress } from "@repo/design-system/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { staffTrainingSimulations } from "@/app/lib/routes";

interface SimulationChoice {
  id: string;
  label: string;
}

interface SimulationStep {
  choices: SimulationChoice[];
  id: string;
  prompt: string;
}

interface SimulationDetail {
  description: string;
  id: string;
  steps: SimulationStep[];
  title: string;
}

interface SimulationRunClientProps {
  simulation: SimulationDetail;
}

export function SimulationRunClient({ simulation }: SimulationRunClientProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [scoreResult, setScoreResult] = useState<{
    passed: boolean;
    score: number;
    feedback: Array<{ stepId: string; correct: boolean; message: string }>;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const step = simulation.steps[stepIndex];
  const progress = useMemo(
    () => ((stepIndex + (finished ? 1 : 0)) / simulation.steps.length) * 100,
    [stepIndex, finished, simulation.steps.length]
  );

  const selectChoice = (choiceId: string) => {
    if (!step || finished) {
      return;
    }
    setAnswers((prev) => ({ ...prev, [step.id]: choiceId }));
  };

  const next = useCallback(async () => {
    if (!(step?.id && answers[step.id])) {
      toast.error("Select an answer first");
      return;
    }

    if (stepIndex < simulation.steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(staffTrainingSimulations(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulationId: simulation.id,
          answers,
        }),
      });
      if (!res.ok) {
        throw new Error("score failed");
      }
      const json = (await res.json()) as {
        passed: boolean;
        score: number;
        feedback: Array<{ stepId: string; correct: boolean; message: string }>;
      };
      setScoreResult(json);
      setFinished(true);
      toast.success(
        json.passed ? "Simulation passed!" : "Review feedback below"
      );
    } catch {
      toast.error("Failed to score simulation");
    } finally {
      setSubmitting(false);
    }
  }, [answers, simulation.id, simulation.steps.length, step, stepIndex]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Button asChild size="sm" variant="ghost">
        <Link href="/staff/training/simulations">
          <ArrowLeft className="mr-1 size-4" />
          All simulations
        </Link>
      </Button>

      <div>
        <h1 className="font-semibold text-2xl">{simulation.title}</h1>
        <p className="text-muted-foreground text-sm">
          {simulation.description}
        </p>
      </div>

      <Progress value={progress} />

      {!finished && step && (
        <Card>
          <CardHeader>
            <CardDescription>
              Step {stepIndex + 1} of {simulation.steps.length}
            </CardDescription>
            <CardTitle className="text-lg">{step.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {step.choices.map((choice) => (
              <Button
                className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                key={choice.id}
                onClick={() => selectChoice(choice.id)}
                variant={answers[step.id] === choice.id ? "default" : "outline"}
              >
                {choice.label}
              </Button>
            ))}
            <Button
              className="mt-4 w-full"
              disabled={submitting}
              onClick={next}
            >
              {stepIndex === simulation.steps.length - 1 ? "Finish" : "Next"}
            </Button>
          </CardContent>
        </Card>
      )}

      {finished && scoreResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {scoreResult.passed ? (
                <CheckCircle className="size-5 text-green-600" />
              ) : (
                <XCircle className="size-5 text-red-600" />
              )}
              Score: {Math.round(scoreResult.score * 100)}%
            </CardTitle>
            <CardDescription>
              {scoreResult.passed
                ? "You passed this simulation."
                : "80% required to pass — try again."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scoreResult.feedback.map((f) => (
              <div className="rounded-lg border p-3 text-sm" key={f.stepId}>
                <Badge variant={f.correct ? "default" : "destructive"}>
                  {f.correct ? "Correct" : "Incorrect"}
                </Badge>
                <p className="mt-2">{f.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
