import { AlertTriangle, Check, Minus, Plus } from "lucide-react";
import {
  getDietaryFullLabel,
  getItemsByIds,
} from "../../engine/menuConstraints";
import type { DietaryFlag, MenuFormData } from "../../types/menu";
import ChipToggle from "../ui/ChipToggle";
import StepHeader from "../ui/StepHeader";

const DIETARY_FLAGS: DietaryFlag[] = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "dairy-free",
  "nut-free",
];

interface Props {
  formData: MenuFormData;
  toggleDietaryNeed: (flag: DietaryFlag) => void;
  updateDietaryCount: (flag: DietaryFlag, count: number) => void;
}

export default function MenuDietaryStep({
  formData,
  toggleDietaryNeed,
  updateDietaryCount,
}: Props) {
  const selectedItems = getItemsByIds(formData.selectedItems);
  const selectedMains = selectedItems.filter(
    (item) => item.category === "main"
  );

  const coverageStatus = DIETARY_FLAGS.map((flag) => {
    const needed = formData.dietaryCoverageNeeds.includes(flag);
    const coveredByMain = selectedMains.some((item) =>
      item.dietaryFlags.includes(flag)
    );
    return { flag, needed, coveredByMain };
  });

  const unmetNeeds = coverageStatus.filter((s) => s.needed && !s.coveredByMain);

  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Select the dietary requirements your guests have. We will check your menu covers them."
        title="Dietary needs"
      />

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          Which dietary needs should your menu cover?
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_FLAGS.map((flag) => (
            <ChipToggle
              key={flag}
              label={getDietaryFullLabel(flag)}
              onClick={() => toggleDietaryNeed(flag)}
              selected={formData.dietaryCoverageNeeds.includes(flag)}
            />
          ))}
        </div>
      </div>

      {formData.dietaryCoverageNeeds.length > 0 && (
        <div className="space-y-4">
          <label className="block font-medium text-sm text-stone-700">
            Approximate guest counts per dietary need
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {formData.dietaryCoverageNeeds.map((flag) => (
              <div
                className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-4 py-3"
                key={flag}
              >
                <span className="text-sm text-stone-700">
                  {getDietaryFullLabel(flag)}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-100"
                    onClick={() =>
                      updateDietaryCount(flag, formData.dietaryCounts[flag] - 5)
                    }
                    type="button"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center font-medium text-sm text-stone-800">
                    {formData.dietaryCounts[flag]}
                  </span>
                  <button
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-100"
                    onClick={() =>
                      updateDietaryCount(flag, formData.dietaryCounts[flag] + 5)
                    }
                    type="button"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.dietaryCoverageNeeds.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 font-medium text-sm text-stone-700">
            Coverage check
          </h3>
          <div className="space-y-2">
            {coverageStatus
              .filter((s) => s.needed)
              .map(({ flag, coveredByMain }) => (
                <div className="flex items-center gap-2" key={flag}>
                  {coveredByMain ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    </div>
                  )}
                  <span
                    className={`text-sm ${coveredByMain ? "text-stone-600" : "text-amber-700"}`}
                  >
                    {getDietaryFullLabel(flag)}{" "}
                    {coveredByMain
                      ? "covered by main course"
                      : "not covered by any main course"}
                  </span>
                </div>
              ))}
          </div>

          {unmetNeeds.length > 0 && (
            <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-amber-600 text-xs">
              Go back and add a main course that is{" "}
              {unmetNeeds
                .map((n) => getDietaryFullLabel(n.flag).toLowerCase())
                .join(", ")}{" "}
              to ensure all guests are covered.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
