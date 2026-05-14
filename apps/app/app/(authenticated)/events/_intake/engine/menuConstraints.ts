import { menuCatalog } from "../config/menuCatalog";
import type {
  DietaryFlag,
  MenuCatalogItem,
  MenuCategory,
  MenuConstraintResult,
  MenuFormData,
  Season,
  ServiceStyle,
} from "../types/menu";

const MINIMUM_BY_CATEGORY: Partial<Record<MenuCategory, number>> = {
  main: 1,
  side: 1,
};

export function getAvailableItems(
  serviceStyle: ServiceStyle | "",
  season: Season
): MenuCatalogItem[] {
  return menuCatalog.filter((item) => {
    if (
      serviceStyle &&
      !item.compatibleStyles.includes(serviceStyle as ServiceStyle)
    )
      return false;
    if (!item.seasons.includes(season)) return false;
    return true;
  });
}

export function getItemById(id: string): MenuCatalogItem | undefined {
  return menuCatalog.find((item) => item.id === id);
}

export function getItemsByIds(ids: string[]): MenuCatalogItem[] {
  return ids
    .map((id) => getItemById(id))
    .filter((item): item is MenuCatalogItem => !!item);
}

export function validateMenuSelection(
  data: MenuFormData
): MenuConstraintResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const selectedItems = getItemsByIds(data.selectedItems);

  const categoryCounts: Partial<Record<MenuCategory, number>> = {};
  for (const item of selectedItems) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  for (const [category, minimum] of Object.entries(MINIMUM_BY_CATEGORY)) {
    const count = categoryCounts[category as MenuCategory] || 0;
    if (count < minimum) {
      errors.push(
        `At least ${minimum} ${category} ${minimum === 1 ? "item is" : "items are"} required.`
      );
    }
  }

  if (data.serviceStyle) {
    for (const item of selectedItems) {
      if (!item.compatibleStyles.includes(data.serviceStyle as ServiceStyle)) {
        errors.push(
          `"${item.name}" is not compatible with ${data.serviceStyle.replace(/-/g, " ")} service.`
        );
      }
    }
  }

  for (const item of selectedItems) {
    if (!item.seasons.includes(data.season)) {
      warnings.push(
        `"${item.name}" may not be available in ${data.season}. Our team will suggest alternatives.`
      );
    }
  }

  if (data.dietaryCoverageNeeds.length > 0) {
    for (const need of data.dietaryCoverageNeeds) {
      const mainsCovering = selectedItems.filter(
        (item) => item.category === "main" && item.dietaryFlags.includes(need)
      );
      if (mainsCovering.length === 0) {
        errors.push(
          `No main course covers the "${need}" dietary need. Please add at least one ${need} main.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function groupByCategory(
  items: MenuCatalogItem[]
): Record<string, MenuCatalogItem[]> {
  const groups: Record<string, MenuCatalogItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  }
  return groups;
}

export function getDietaryLabel(flag: DietaryFlag): string {
  const labels: Record<DietaryFlag, string> = {
    vegetarian: "V",
    vegan: "VG",
    "gluten-free": "GF",
    "dairy-free": "DF",
    "nut-free": "NF",
  };
  return labels[flag];
}

export function getDietaryFullLabel(flag: DietaryFlag): string {
  const labels: Record<DietaryFlag, string> = {
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    "gluten-free": "Gluten-Free",
    "dairy-free": "Dairy-Free",
    "nut-free": "Nut-Free",
  };
  return labels[flag];
}
