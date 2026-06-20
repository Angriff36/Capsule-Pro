/**
 * Training simulation scenario catalog (shared by app SSR and API scoring).
 */

export interface SimulationChoice {
  feedback: string;
  id: string;
  isCorrect: boolean;
  label: string;
}

export interface SimulationStep {
  choices: SimulationChoice[];
  id: string;
  prompt: string;
}

export interface TrainingSimulation {
  category: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationMinutes: number;
  id: string;
  steps: SimulationStep[];
  title: string;
}

export const BUILT_IN_SIMULATIONS: TrainingSimulation[] = [
  {
    id: "food-safety-temp",
    title: "Food Safety: Temperature Check",
    category: "food_safety",
    description:
      "Walk through receiving a delivery and deciding whether to accept chilled proteins.",
    durationMinutes: 8,
    difficulty: "beginner",
    steps: [
      {
        id: "step-1",
        prompt:
          "A vendor delivers chicken at 48°F. The spec requires ≤41°F. What do you do?",
        choices: [
          {
            id: "a",
            label: "Accept and move to walk-in immediately",
            isCorrect: false,
            feedback: "Never accept product outside safe temperature range.",
          },
          {
            id: "b",
            label: "Reject the delivery and log the incident",
            isCorrect: true,
            feedback: "Correct — reject, document, and notify the manager.",
          },
          {
            id: "c",
            label: "Accept but cook within 30 minutes",
            isCorrect: false,
            feedback: "Time-temperature abuse is not a valid workaround.",
          },
        ],
      },
      {
        id: "step-2",
        prompt: "After rejection, what is the required next step?",
        choices: [
          {
            id: "a",
            label: "Update the vendor scorecard and file a QA note",
            isCorrect: true,
            feedback: "Document vendor performance for procurement review.",
          },
          {
            id: "b",
            label: "Reorder from the same truck",
            isCorrect: false,
            feedback: "Do not reorder compromised product from the same load.",
          },
        ],
      },
    ],
  },
  {
    id: "service-recovery",
    title: "Service Recovery Under Pressure",
    category: "service",
    description: "Handle a late VIP course during a 200-guest plated dinner.",
    durationMinutes: 12,
    difficulty: "intermediate",
    steps: [
      {
        id: "step-1",
        prompt:
          "Banquet captain reports table 12 mains are 12 minutes behind. First move?",
        choices: [
          {
            id: "a",
            label: "Hold all other tables until table 12 catches up",
            isCorrect: false,
            feedback: "Stalling the room amplifies the failure.",
          },
          {
            id: "b",
            label: "Expedite table 12, communicate delay to adjacent tables",
            isCorrect: true,
            feedback: "Prioritize recovery while keeping the room informed.",
          },
        ],
      },
    ],
  },
  {
    id: "allergen-protocol",
    title: "Allergen Escalation",
    category: "food_safety",
    description:
      "Respond when a guest reports a nut allergy after service started.",
    durationMinutes: 10,
    difficulty: "advanced",
    steps: [
      {
        id: "step-1",
        prompt:
          "Guest reports tree-nut allergy; amuse already served. Best response?",
        choices: [
          {
            id: "a",
            label:
              "Confirm with kitchen, replace service ware, rebuild course plan",
            isCorrect: true,
            feedback: "Full allergen protocol: stop, verify, reset, document.",
          },
          {
            id: "b",
            label: "Offer to scrape sauce off the next course",
            isCorrect: false,
            feedback:
              "Cross-contact risk — never modify in place for declared allergens.",
          },
        ],
      },
    ],
  },
];

export function getSimulationById(id: string): TrainingSimulation | undefined {
  return BUILT_IN_SIMULATIONS.find((s) => s.id === id);
}

export function scoreSimulation(
  simulation: TrainingSimulation,
  answers: Record<string, string>
): {
  passed: boolean;
  score: number;
  total: number;
  feedback: Array<{ stepId: string; correct: boolean; message: string }>;
} {
  const feedback: Array<{ stepId: string; correct: boolean; message: string }> =
    [];
  let correct = 0;

  for (const step of simulation.steps) {
    const answerId = answers[step.id];
    const choice = step.choices.find((c) => c.id === answerId);
    const isCorrect = choice?.isCorrect ?? false;
    if (isCorrect) {
      correct += 1;
    }
    feedback.push({
      stepId: step.id,
      correct: isCorrect,
      message: choice?.feedback ?? "No answer selected",
    });
  }

  const total = simulation.steps.length;
  const score = total > 0 ? correct / total : 0;

  return {
    passed: score >= 0.8,
    score,
    total,
    feedback,
  };
}
