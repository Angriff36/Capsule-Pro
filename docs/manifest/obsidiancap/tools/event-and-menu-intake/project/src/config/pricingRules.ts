import type { PricingRules } from '../types/pricing';

export const defaultPricingRules: PricingRules = {
  basePerPerson: [
    { label: 'Under 50', low: 85, high: 150 },
    { label: '50–100', low: 75, high: 135 },
    { label: '100–200', low: 65, high: 120 },
    { label: '200–500', low: 55, high: 105 },
    { label: '500+', low: 45, high: 95 },
  ],

  serviceStyleModifiers: {
    plated: { label: 'Plated Dinner', multiplierLow: 1.15, multiplierHigh: 1.3 },
    buffet: { label: 'Buffet', multiplierLow: 0.9, multiplierHigh: 1.0 },
    stations: { label: 'Food Stations', multiplierLow: 1.0, multiplierHigh: 1.15 },
    'family-style': { label: 'Family Style', multiplierLow: 1.05, multiplierHigh: 1.2 },
    'drop-off': { label: 'Drop-Off', multiplierLow: 0.6, multiplierHigh: 0.75 },
    'cocktail-reception': { label: 'Cocktail Reception', multiplierLow: 0.85, multiplierHigh: 1.0 },
  },

  staffingModifiers: {
    minimal: { label: 'Minimal (drop-off only)', perPersonAddonLow: 0, perPersonAddonHigh: 0 },
    standard: { label: 'Standard Service', perPersonAddonLow: 8, perPersonAddonHigh: 15 },
    elevated: { label: 'Elevated (dedicated servers)', perPersonAddonLow: 15, perPersonAddonHigh: 28 },
    'white-glove': { label: 'White Glove (full team)', perPersonAddonLow: 25, perPersonAddonHigh: 45 },
  },

  barModifiers: {
    none: { label: 'No Bar Service', perPersonLow: 0, perPersonHigh: 0 },
    'beer-wine': { label: 'Beer & Wine Only', perPersonLow: 15, perPersonHigh: 28 },
    'full-bar': { label: 'Full Bar (well)', perPersonLow: 28, perPersonHigh: 45 },
    'premium-bar': { label: 'Premium / Craft Bar', perPersonLow: 42, perPersonHigh: 65 },
    'byob-service': { label: 'BYOB (bartender only)', perPersonLow: 8, perPersonHigh: 15 },
  },

  rentalAddons: {
    'tables-chairs': { label: 'Tables & Chairs', flatFeeLow: 400, flatFeeHigh: 1200 },
    linens: { label: 'Linens & Napkins', flatFeeLow: 200, flatFeeHigh: 800 },
    'china-flatware': { label: 'China & Flatware', flatFeeLow: 300, flatFeeHigh: 1500 },
    glassware: { label: 'Glassware', flatFeeLow: 150, flatFeeHigh: 600 },
    'chafing-dishes': { label: 'Chafing Dishes & Warmers', flatFeeLow: 100, flatFeeHigh: 400 },
    tent: { label: 'Tent / Canopy', flatFeeLow: 800, flatFeeHigh: 3500 },
  },

  addOnItems: {
    'late-night-snack': { label: 'Late Night Snack Station', perPersonLow: 8, perPersonHigh: 18 },
    'dessert-table': { label: 'Dessert Table', perPersonLow: 6, perPersonHigh: 15 },
    'grazing-display': { label: 'Grazing / Charcuterie Display', perPersonLow: 10, perPersonHigh: 22 },
    'raw-bar': { label: 'Raw Bar / Oyster Station', perPersonLow: 14, perPersonHigh: 28 },
    'espresso-cart': { label: 'Espresso Cart', perPersonLow: 5, perPersonHigh: 12 },
    'action-station': { label: 'Live Action Station (chef)', perPersonLow: 12, perPersonHigh: 25 },
  },

  courseCountModifier: {
    baseCount: 3,
    perExtraCourseLow: 8,
    perExtraCourseHigh: 15,
  },

  minimumSpend: 2500,
};
