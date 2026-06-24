import type { PricingRules } from "../types/pricing";
import type { PriceEstimate, WizardFormData } from "../types/wizard";

const DEFAULT_RANGE: { low: number; high: number } = { low: 0, high: 0 };

function getBasePerPerson(
  rules: PricingRules,
  guestCount: number
): { low: number; high: number } {
  if (guestCount >= 500) {
    return rules.basePerPerson[4] ?? DEFAULT_RANGE;
  }
  if (guestCount >= 200) {
    return rules.basePerPerson[3] ?? DEFAULT_RANGE;
  }
  if (guestCount >= 100) {
    return rules.basePerPerson[2] ?? DEFAULT_RANGE;
  }
  if (guestCount >= 50) {
    return rules.basePerPerson[1] ?? DEFAULT_RANGE;
  }
  return rules.basePerPerson[0] ?? DEFAULT_RANGE;
}

export function calculateEstimate(
  data: WizardFormData,
  rules: PricingRules
): PriceEstimate {
  const guestCount = Math.max(data.guestCount || 20, 10);
  const base = getBasePerPerson(rules, guestCount);

  let perPersonLow = base.low;
  let perPersonHigh = base.high;

  const styleModifier = rules.serviceStyleModifiers[data.serviceStyle];
  if (styleModifier) {
    perPersonLow *= styleModifier.multiplierLow;
    perPersonHigh *= styleModifier.multiplierHigh;
  }

  const extraCourses = Math.max(
    (data.courseCount || rules.courseCountModifier.baseCount) -
      rules.courseCountModifier.baseCount,
    0
  );
  if (extraCourses > 0) {
    perPersonLow += extraCourses * rules.courseCountModifier.perExtraCourseLow;
    perPersonHigh +=
      extraCourses * rules.courseCountModifier.perExtraCourseHigh;
  }

  const staffingMod = rules.staffingModifiers[data.staffingLevel];
  if (staffingMod) {
    perPersonLow += staffingMod.perPersonAddonLow;
    perPersonHigh += staffingMod.perPersonAddonHigh;
  }

  const barMod = rules.barModifiers[data.barService];
  if (barMod) {
    perPersonLow += barMod.perPersonLow;
    perPersonHigh += barMod.perPersonHigh;
  }

  for (const addOn of data.addOns) {
    const addOnItem = rules.addOnItems[addOn];
    if (addOnItem) {
      perPersonLow += addOnItem.perPersonLow;
      perPersonHigh += addOnItem.perPersonHigh;
    }
  }

  let totalLow = perPersonLow * guestCount;
  let totalHigh = perPersonHigh * guestCount;

  for (const rental of data.rentalsNeeded) {
    const rentalItem = rules.rentalAddons[rental];
    if (rentalItem) {
      totalLow += rentalItem.flatFeeLow;
      totalHigh += rentalItem.flatFeeHigh;
    }
  }

  totalLow = Math.max(totalLow, rules.minimumSpend);
  totalHigh = Math.max(totalHigh, rules.minimumSpend);

  return {
    low: Math.round(totalLow / 100) * 100,
    high: Math.round(totalHigh / 100) * 100,
  };
}
