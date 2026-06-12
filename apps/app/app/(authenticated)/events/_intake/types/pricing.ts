export interface PerPersonRange {
  high: number;
  label: string;
  low: number;
}

export interface ServiceStyleModifier {
  label: string;
  multiplierHigh: number;
  multiplierLow: number;
}

export interface StaffingModifier {
  label: string;
  perPersonAddonHigh: number;
  perPersonAddonLow: number;
}

export interface BarModifier {
  label: string;
  perPersonHigh: number;
  perPersonLow: number;
}

export interface RentalAddon {
  flatFeeHigh: number;
  flatFeeLow: number;
  label: string;
}

export interface AddOnItem {
  label: string;
  perPersonHigh: number;
  perPersonLow: number;
}

export interface PricingRules {
  addOnItems: Record<string, AddOnItem>;
  barModifiers: Record<string, BarModifier>;
  basePerPerson: PerPersonRange[];
  courseCountModifier: {
    baseCount: number;
    perExtraCourseLow: number;
    perExtraCourseHigh: number;
  };
  minimumSpend: number;
  rentalAddons: Record<string, RentalAddon>;
  serviceStyleModifiers: Record<string, ServiceStyleModifier>;
  staffingModifiers: Record<string, StaffingModifier>;
}
