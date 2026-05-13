import { useState, useCallback, useMemo } from 'react';
import type { WizardFormData, PriceEstimate, WizardStep } from '../types/wizard';
import type { PricingRules } from '../types/pricing';
import { calculateEstimate } from '../engine/pricingEngine';

const INITIAL_FORM_DATA: WizardFormData = {
  contactName: '',
  email: '',
  phone: '',
  company: '',
  eventName: '',
  occasionType: '',
  vibeDescription: '',
  eventFormat: '',
  guestCount: 100,
  guestCountCertainty: '',
  serviceStyle: '',
  courseCount: 3,
  cuisinePreferences: [],
  dietaryNeeds: [],
  dietaryPercentage: '',
  menuNotes: '',
  staffingLevel: '',
  staffingNotes: '',
  barService: '',
  rentalsNeeded: [],
  addOns: [],
  eventDate: '',
  dateFlexibility: '',
  venueType: '',
  city: '',
  venueName: '',
  budgetRange: '',
  referralSource: '',
  additionalNotes: '',
};

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'vision', title: 'Your Vision', subtitle: 'Tell us about your event', icon: 'Sparkles' },
  { id: 'details', title: 'Event Details', subtitle: 'Type, format & guest count', icon: 'Users' },
  { id: 'service', title: 'Service Style', subtitle: 'How should we serve?', icon: 'UtensilsCrossed' },
  { id: 'menu', title: 'Menu & Dietary', subtitle: 'Cuisine & dietary needs', icon: 'ChefHat' },
  { id: 'staffing', title: 'Staffing', subtitle: 'Your service team', icon: 'UserCheck' },
  { id: 'extras', title: 'Extras & Bar', subtitle: 'Rentals, bar & add-ons', icon: 'Wine' },
  { id: 'logistics', title: 'Logistics', subtitle: 'Date, venue & location', icon: 'MapPin' },
  { id: 'contact', title: 'Final Details', subtitle: 'Notes & contact info', icon: 'Send' },
  { id: 'review', title: 'Review', subtitle: 'Your estimate & summary', icon: 'ClipboardCheck' },
];

export function useWizardState(pricingRules: PricingRules) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateField = useCallback(<K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleArrayItem = useCallback((field: keyof WizardFormData, item: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      const next = current.includes(item)
        ? current.filter(i => i !== item)
        : [...current, item];
      return { ...prev, [field]: next };
    });
  }, []);

  const estimate: PriceEstimate = useMemo(
    () => calculateEstimate(formData, pricingRules),
    [formData, pricingRules]
  );

  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < WIZARD_STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  return {
    currentStep,
    formData,
    estimate,
    isSubmitting,
    isSubmitted,
    setIsSubmitting,
    setIsSubmitted,
    updateField,
    toggleArrayItem,
    goNext,
    goBack,
    goToStep,
  };
}
