export interface PerPersonRange {
  label: string;
  low: number;
  high: number;
}

export interface ServiceStyleModifier {
  label: string;
  multiplierLow: number;
  multiplierHigh: number;
}

export interface StaffingModifier {
  label: string;
  perPersonAddonLow: number;
  perPersonAddonHigh: number;
}

export interface BarModifier {
  label: string;
  perPersonLow: number;
  perPersonHigh: number;
}

export interface RentalAddon {
  label: string;
  flatFeeLow: number;
  flatFeeHigh: number;
}

export interface AddOnItem {
  label: string;
  perPersonLow: number;
  perPersonHigh: number;
}

export interface PricingRules {
  basePerPerson: PerPersonRange[];
  serviceStyleModifiers: Record<string, ServiceStyleModifier>;
  staffingModifiers: Record<string, StaffingModifier>;
  barModifiers: Record<string, BarModifier>;
  rentalAddons: Record<string, RentalAddon>;
  addOnItems: Record<string, AddOnItem>;
  courseCountModifier: {
    baseCount: number;
    perExtraCourseLow: number;
    perExtraCourseHigh: number;
  };
  minimumSpend: number;
}
