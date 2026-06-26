import {
  getSimulationById,
  scoreSimulation,
} from "@repo/types/training-simulations";
// @boundaries-ignore automatically added by `turbo boundaries --ignore=all`
"vitest";

describe("training-simulations", () => {
  it("scores a perfect run as passed", () => {
    const sim = getSimulationById("food-safety-temp");
    expect(sim).toBeDefined();
    const result = scoreSimulation(sim!, {
      "step-1": "b",
      "step-2": "a",
    });
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });

  it("fails when below 80%", () => {
    const sim = getSimulationById("food-safety-temp");
    const result = scoreSimulation(sim!, {
      "step-1": "a",
      "step-2": "b",
    });
    expect(result.passed).toBe(false);
  });
});
