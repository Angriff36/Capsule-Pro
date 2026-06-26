import { auth } from "@repo/auth/server";
import {
  BUILT_IN_SIMULATIONS,
  getSimulationById,
// @boundaries-ignore automatically added by `turbo boundaries --ignore=all`
"@repo/types/training-simulations";
import { notFound } from "next/navigation";
import { SimulationRunClient } from "./simulation-run-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return BUILT_IN_SIMULATIONS.map((s) => ({ id: s.id }));
}

export default async function SimulationRunPage({ params }: PageProps) {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  const { id } = await params;
  const simulation = getSimulationById(id);
  if (!simulation) {
    notFound();
  }

  return (
    <SimulationRunClient
      simulation={{
        id: simulation.id,
        title: simulation.title,
        description: simulation.description,
        steps: simulation.steps.map((step) => ({
          id: step.id,
          prompt: step.prompt,
          choices: step.choices.map((c) => ({ id: c.id, label: c.label })),
        })),
      }}
    />
  );
}
