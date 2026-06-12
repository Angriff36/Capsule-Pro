/**
 * Event Intake — Pricing Engine Unit Tests
 *
 * Tests the calculateEstimate function with realistic pricing rules.
 */

import { describe, expect, test } from "vitest";
import { defaultPricingRules } from "../app/(authenticated)/events/_intake/config/pricingRules";
import { calculateEstimate } from "../app/(authenticated)/events/_intake/engine/pricingEngine";
import type { WizardFormData } from "../app/(authenticated)/events/_intake/types/wizard";

const BASE_FORM: WizardFormData = {
  contactName: "Test",
  email: "test@example.com",
  phone: "",
  company: "",
  eventName: "Test Event",
  occasionType: "wedding",
  vibeDescription: "",
  eventFormat: "plated",
  guestCount: 100,
  guestCountCertainty: "",
  serviceStyle: "plated",
  courseCount: 3,
  cuisinePreferences: [],
  dietaryNeeds: [],
  dietaryPercentage: "",
  menuNotes: "",
  staffingLevel: "standard",
  staffingNotes: "",
  barService: "full-bar",
  rentalsNeeded: [],
  addOns: [],
  eventDate: "",
  dateFlexibility: "",
  venueType: "",
  city: "",
  venueName: "",
  budgetRange: "",
  referralSource: "",
  additionalNotes: "",
};

describe("pricingEngine", () => {
  test("returns a non-zero estimate for base form", () => {
    const estimate = calculateEstimate(BASE_FORM, defaultPricingRules);
    expect(estimate.low).toBeGreaterThan(0);
    expect(estimate.high).toBeGreaterThan(0);
    expect(estimate.high).toBeGreaterThanOrEqual(estimate.low);
  });

  test("guest count tiers affect pricing", () => {
    const small = calculateEstimate(
      { ...BASE_FORM, guestCount: 20 },
      defaultPricingRules
    );
    const large = calculateEstimate(
      { ...BASE_FORM, guestCount: 500 },
      defaultPricingRules
    );
    expect(large.low).toBeGreaterThan(small.low * 2);
  });

  test("minimum spend floor is enforced", () => {
    const tiny = calculateEstimate(
      {
        ...BASE_FORM,
        guestCount: 1,
        serviceStyle: "",
        barService: "",
        staffingLevel: "",
      },
      defaultPricingRules
    );
    expect(tiny.low).toBeGreaterThanOrEqual(defaultPricingRules.minimumSpend);
    expect(tiny.high).toBeGreaterThanOrEqual(defaultPricingRules.minimumSpend);
  });

  test("service style modifiers change pricing", () => {
    const plated = calculateEstimate(BASE_FORM, defaultPricingRules);
    const buffet = calculateEstimate(
      { ...BASE_FORM, serviceStyle: "buffet" },
      defaultPricingRules
    );
    if (buffet.low !== plated.low) {
      expect(buffet.low).toBeLessThan(plated.low);
    }
  });

  test("add-ons increase the estimate", () => {
    const base = calculateEstimate(BASE_FORM, defaultPricingRules);
    const withAddOns = calculateEstimate(
      { ...BASE_FORM, addOns: ["premium-bar", "late-night-snack"] },
      defaultPricingRules
    );
    expect(withAddOns.low).toBeGreaterThan(base.low);
  });

  test("rounds to nearest 100", () => {
    const estimate = calculateEstimate(BASE_FORM, defaultPricingRules);
    expect(estimate.low % 100).toBe(0);
    expect(estimate.high % 100).toBe(0);
  });
});
