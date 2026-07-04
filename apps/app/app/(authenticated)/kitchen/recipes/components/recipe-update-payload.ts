interface ModalIngredient {
  id?: string;
  name: string;
  notes?: string;
  quantity: string;
  unit: string;
}

interface ModalStep {
  id?: string;
  instruction: string;
  step_number: number;
}

/**
 * Converts FormData from RecipeEditModal to the JSON payload for the
 * composite recipe update-with-version route. Shared by the recipes list
 * page client and the recipe detail edit button so both read the field
 * names the modal actually renders.
 */
export function buildUpdatePayload(formData: FormData) {
  const ingredientsRaw = formData.get("ingredients") as string;
  const stepsRaw = formData.get("steps") as string;

  let ingredients: ModalIngredient[] = [];
  let steps: ModalStep[] = [];

  try {
    if (ingredientsRaw) {
      ingredients = JSON.parse(ingredientsRaw) as ModalIngredient[];
    }
  } catch {
    // Ignore parse errors
  }

  try {
    if (stepsRaw) {
      steps = JSON.parse(stepsRaw) as ModalStep[];
    }
  } catch {
    // Ignore parse errors
  }

  // Convert ingredients to raw format (name + unit code) for server resolution
  const formattedIngredients = ingredients.map((ing, idx) => ({
    name: ing.name,
    quantity: Number.parseFloat(ing.quantity) || 0,
    unit: ing.unit || null,
    sortOrder: idx,
  }));

  // Convert steps to route format
  const formattedSteps = steps.map((step, idx) => ({
    stepNumber: idx + 1,
    instruction: step.instruction,
  }));

  return {
    name: (formData.get("name") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    tags: formData.get("tags")
      ? ((formData.get("tags") as string) || "").split(",").filter(Boolean)
      : undefined,
    yieldQuantity: formData.get("yieldQuantity")
      ? Number.parseInt(formData.get("yieldQuantity") as string, 10)
      : undefined,
    yieldUnitId: formData.get("yieldUnitId")
      ? Number.parseInt(formData.get("yieldUnitId") as string, 10) || undefined
      : undefined,
    yieldDescription: (formData.get("yieldDescription") as string) || undefined,
    prepTimeMinutes: formData.get("prepTimeMinutes")
      ? Number.parseInt(formData.get("prepTimeMinutes") as string, 10)
      : undefined,
    cookTimeMinutes: formData.get("cookTimeMinutes")
      ? Number.parseInt(formData.get("cookTimeMinutes") as string, 10)
      : undefined,
    restTimeMinutes: formData.get("restTimeMinutes")
      ? Number.parseInt(formData.get("restTimeMinutes") as string, 10)
      : undefined,
    difficultyLevel: formData.get("difficultyLevel")
      ? Number.parseInt(formData.get("difficultyLevel") as string, 10)
      : undefined,
    ingredients:
      formattedIngredients.length > 0 ? formattedIngredients : undefined,
    steps: formattedSteps.length > 0 ? formattedSteps : undefined,
  };
}
