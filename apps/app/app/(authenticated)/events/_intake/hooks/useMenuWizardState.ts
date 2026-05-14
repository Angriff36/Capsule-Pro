import { useCallback, useMemo, useState } from "react";
import { getCurrentSeason, getItemsByIds } from "../engine/menuConstraints";
import type {
  CostDataProvider,
  DietaryFlag,
  DishCost,
  MenuFormData,
} from "../types/menu";
import type { WizardStep } from "../types/wizard";

const INITIAL_MENU_DATA: MenuFormData = {
  occasionType: "",
  season: getCurrentSeason(),
  guestCount: 100,
  serviceStyle: "",
  menuDirection: "",
  selectedItems: [],
  dietaryCoverageNeeds: [],
  dietaryCounts: {
    vegetarian: 0,
    vegan: 0,
    "gluten-free": 0,
    "dairy-free": 0,
    "nut-free": 0,
  },
  addOnSelections: [],
  barService: "",
  notes: "",
};

export const MENU_WIZARD_STEPS: WizardStep[] = [
  {
    id: "context",
    title: "Event Context",
    subtitle: "Occasion, season & scale",
    icon: "Calendar",
  },
  {
    id: "service-style",
    title: "Service Style",
    subtitle: "How should we serve?",
    icon: "UtensilsCrossed",
  },
  {
    id: "direction",
    title: "Menu Direction",
    subtitle: "Choose a culinary theme",
    icon: "Compass",
  },
  {
    id: "mains",
    title: "Main Courses",
    subtitle: "Select your proteins",
    icon: "Beef",
  },
  {
    id: "sides",
    title: "Sides & More",
    subtitle: "Accompaniments & appetizers",
    icon: "Salad",
  },
  {
    id: "dietary",
    title: "Dietary Needs",
    subtitle: "Coverage & guest counts",
    icon: "ShieldCheck",
  },
  {
    id: "addons",
    title: "Add-Ons",
    subtitle: "Dessert, late night & bar",
    icon: "Sparkles",
  },
  {
    id: "review",
    title: "Review Menu",
    subtitle: "Preview & export",
    icon: "ClipboardCheck",
  },
];

export function useMenuWizardState(costProvider?: CostDataProvider) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MenuFormData>(INITIAL_MENU_DATA);
  const [costCache, setCostCache] = useState<Record<string, DishCost>>({});
  const [menuStory, setMenuStory] = useState("");
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const updateField = useCallback(
    <K extends keyof MenuFormData>(field: K, value: MenuFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const toggleMenuItem = useCallback((itemId: string) => {
    setFormData((prev) => {
      const next = prev.selectedItems.includes(itemId)
        ? prev.selectedItems.filter((id) => id !== itemId)
        : [...prev.selectedItems, itemId];
      return { ...prev, selectedItems: next };
    });
  }, []);

  const toggleAddOn = useCallback((addOn: string) => {
    setFormData((prev) => {
      const next = prev.addOnSelections.includes(addOn)
        ? prev.addOnSelections.filter((a) => a !== addOn)
        : [...prev.addOnSelections, addOn];
      return { ...prev, addOnSelections: next };
    });
  }, []);

  const toggleDietaryNeed = useCallback((flag: DietaryFlag) => {
    setFormData((prev) => {
      const next = prev.dietaryCoverageNeeds.includes(flag)
        ? prev.dietaryCoverageNeeds.filter((f) => f !== flag)
        : [...prev.dietaryCoverageNeeds, flag];
      return { ...prev, dietaryCoverageNeeds: next };
    });
  }, []);

  const updateDietaryCount = useCallback((flag: DietaryFlag, count: number) => {
    setFormData((prev) => ({
      ...prev,
      dietaryCounts: { ...prev.dietaryCounts, [flag]: Math.max(0, count) },
    }));
  }, []);

  const loadCosts = useCallback(
    async (dishIds: string[]) => {
      if (!costProvider) return;
      const uncached = dishIds.filter((id) => !costCache[id]);
      if (uncached.length === 0) return;

      const results: Record<string, DishCost> = {};
      for (const id of uncached) {
        const cost = await costProvider.getCOGS(id);
        if (cost) results[id] = cost;
      }
      setCostCache((prev) => ({ ...prev, ...results }));
    },
    [costProvider, costCache]
  );

  const totalSteps = MENU_WIZARD_STEPS.length;

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps]
  );

  const reset = useCallback(() => {
    setCurrentStep(0);
    setFormData(INITIAL_MENU_DATA);
    setCostCache({});
    setMenuStory("");
  }, []);

  const perPersonTotal = useMemo(() => {
    const items = getItemsByIds(formData.selectedItems);
    return items.reduce((sum, item) => sum + item.pricePerPerson, 0);
  }, [formData.selectedItems]);

  return {
    currentStep,
    formData,
    costCache,
    menuStory,
    isGeneratingStory,
    perPersonTotal,
    setMenuStory,
    setIsGeneratingStory,
    updateField,
    toggleMenuItem,
    toggleAddOn,
    toggleDietaryNeed,
    updateDietaryCount,
    loadCosts,
    goNext,
    goBack,
    goToStep,
    reset,
  };
}
